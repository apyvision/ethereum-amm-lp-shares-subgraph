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

let PROVIDER_NAME = "VALUE";

export function handleTransfer(event: Transfer): void {
  let poolAddress = event.address;
  let to = event.params.dst as Address;
  let from = event.params.src as Address;
  let amt = event.params.amt;

  // this is who executed the txn, it can be diff than the from address
  let initiator = event.transaction.from;

  if (to.toHexString() == ADDRESS_ZERO) { // BURN
    log.warning("[{}] BURN event for tx {} for user {} with amount {}", [PROVIDER_NAME, event.transaction.hash.toHexString(), from.toHexString(), amt.toString()])

    updateDayData(createOrUpdateLiquidityPosition(PROVIDER_NAME, poolAddress, from, amt.times(MINUS_ONE)), from, event);
    createTransferEvent(event, from, from, to, amt)
    createMintBurnLog(event, from, amt.times(MINUS_ONE))

    // if the from is not same as initator, also record this (since some contracts are using relayers, we want to log the "from" to the from event
    if (from != initiator) {
      updateDayData(createOrUpdateLiquidityPosition(PROVIDER_NAME, poolAddress, initiator, amt.times(MINUS_ONE)), initiator, event);
      createTransferEvent(event, initiator, initiator, to, amt)
      createMintBurnLog(event, initiator, amt.times(MINUS_ONE))
    }


  } else if (from.toHexString() == ADDRESS_ZERO) { // MINT
    log.warning("[{}] MINT event for tx {} for user {} with amount {}", [PROVIDER_NAME, event.transaction.hash.toHexString(), to.toHexString(), amt.toString()])

    updateDayData(createOrUpdateLiquidityPosition(PROVIDER_NAME, poolAddress, to, amt), to, event);
    createTransferEvent(event, to, from, to, amt)
    createMintBurnLog(event, to, amt)

    // if the to is not same as initator, also record this (since some contracts are using relayers, we want to log the "to" to the from event
    if (to != initiator) {
      updateDayData(createOrUpdateLiquidityPosition(PROVIDER_NAME, poolAddress, initiator, amt), initiator, event);
      createTransferEvent(event, initiator, from, initiator, amt)
      createMintBurnLog(event, initiator, amt)
    }


  } else { // TRANSFER
    updateDayData(createOrUpdateLiquidityPosition(PROVIDER_NAME, poolAddress, to, ZERO_BI), to, event);
    updateDayData(createOrUpdateLiquidityPosition(PROVIDER_NAME, poolAddress, from, ZERO_BI), from, event);
    if (initiator != to && initiator != from) {
      updateDayData(createOrUpdateLiquidityPosition(PROVIDER_NAME, poolAddress, initiator, ZERO_BI), initiator, event);
    }

    // we don't need to keep track of the initiator here because the transfer logs will have logged the lp token transfer event
    createTransferEvent(event, from, from, to, amt)
    createTransferEvent(event, to, from, to, amt)

  }
}

export function handleNewPool(event: LOG_NEW_POOL): void {
  let poolAddress = event.params.pool;
  log.warning("[{}] Creating factory tracking for pair address: {}", [PROVIDER_NAME, poolAddress.toHexString()])
  BPoolTemplate.create(poolAddress);
}

