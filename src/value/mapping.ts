import {Transfer} from '../../generated/ValueBFactory/FaaSPoolLite'
import {Address, log} from "@graphprotocol/graph-ts";
import {LOG_NEW_POOL} from "../../generated/ValueBFactory/BFactory";
import {ValueBPool as BPoolTemplate} from '../../generated/templates'
import {
  ADDRESS_ZERO, createMintBurnLog,
  createOrUpdateLiquidityPosition,
  createTransferEvent,
  MINUS_ONE,
  updateDayData,
  ZERO_BI
} from "../util";
import {LPTransfer} from "../../generated/schema";

let PROVIDER_KEY = "value_eth";

export function handleTransfer(event: Transfer): void {
  let poolAddress = event.address;
  let to = event.params.dst as Address;
  let from = event.params.src as Address;
  let amt = event.params.amt;

  if (to.toHexString() == ADDRESS_ZERO) { // BURN
    log.warning("[{}] BURN event for tx {} for user {} with amount {}", [PROVIDER_KEY, event.transaction.hash.toHexString(), from.toHexString(), amt.toString()])

    updateDayData(createOrUpdateLiquidityPosition(PROVIDER_KEY, poolAddress, from, amt.times(MINUS_ONE)), from, event);
    createTransferEvent(event, from, from, to, amt)

  } else if (from.toHexString() == ADDRESS_ZERO) { // MINT
    log.warning("[{}] MINT event for tx {} for user {} with amount {}", [PROVIDER_KEY, event.transaction.hash.toHexString(), to.toHexString(), amt.toString()])

    updateDayData(createOrUpdateLiquidityPosition(PROVIDER_KEY, poolAddress, to, amt), to, event);
    createTransferEvent(event, to, from, to, amt)

  } else { // TRANSFER
    updateDayData(createOrUpdateLiquidityPosition(PROVIDER_KEY, poolAddress, to, ZERO_BI), to, event);
    updateDayData(createOrUpdateLiquidityPosition(PROVIDER_KEY, poolAddress, from, ZERO_BI), from, event);
    // we don't need to keep track of the initiator here because the transfer logs will have logged the lp token transfer event
    createTransferEvent(event, from, from, to, amt)
    createTransferEvent(event, to, from, to, amt)

  }
}

export function handleNewPool(event: LOG_NEW_POOL): void {
  let poolAddress = event.params.pool;
  log.warning("[{}] Creating factory tracking for pair address: {}", [PROVIDER_KEY, poolAddress.toHexString()])
  BPoolTemplate.create(poolAddress);
}

