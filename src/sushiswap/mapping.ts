/* eslint-disable prefer-const */
import {Address, log} from '@graphprotocol/graph-ts'
import {Transfer} from '../../generated/templates/SushiswapPair/Pair'
import {
  ADDRESS_ZERO,
  createOrUpdateLiquidityPosition,
  createTransferEvent,
  MINUS_ONE,
  updateDayData,
  ZERO_BI
} from "../util";

let PROVIDER_NAME = "Sushiswap";

export function handleTransfer(event: Transfer): void {
  let poolAddress = event.address;
  let to = event.params.to as Address;
  let from = event.params.from as Address;
  let amt = event.params.value;

  // this is who executed the txn, it can be diff than the from address
  let initiator = event.transaction.from;

  if (to.toHexString() == ADDRESS_ZERO) { // BURN
    log.warning("[{}] BURN event for tx {} for user {} with amount {}", [PROVIDER_NAME, event.transaction.hash.toHexString(), initiator.toHexString(), amt.toString()])

    updateDayData(createOrUpdateLiquidityPosition(PROVIDER_NAME, poolAddress, initiator, amt.times(MINUS_ONE)), initiator, event);

    // if the from is not same as initator, also record this (since some contracts are using relayers, we want to log the "from" to the from event
    if (from != initiator) {
      updateDayData(createOrUpdateLiquidityPosition(PROVIDER_NAME, poolAddress, from, amt.times(MINUS_ONE)), from, event);
    }

    createTransferEvent(event, from, from, to, amt)

  } else if (from.toHexString() == ADDRESS_ZERO) { // MINT
    log.warning("[{}] MINT event for tx {} for user {} with amount {}", [PROVIDER_NAME, event.transaction.hash.toHexString(), initiator.toHexString(), amt.toString()])

    updateDayData(createOrUpdateLiquidityPosition(PROVIDER_NAME, poolAddress, initiator, amt), initiator, event);

    // if the from is not same as initator, also record this (since some contracts are using relayers, we want to log the "from" to the from event
    if (to != initiator) {
      updateDayData(createOrUpdateLiquidityPosition(PROVIDER_NAME, poolAddress, to, amt.times(MINUS_ONE)), from, event);
    }

    createTransferEvent(event, to, from, to, amt)

  } else { // TRANSFER
    updateDayData(createOrUpdateLiquidityPosition(PROVIDER_NAME, poolAddress, to, ZERO_BI), to, event);
    updateDayData(createOrUpdateLiquidityPosition(PROVIDER_NAME, poolAddress, from, ZERO_BI), from, event);
    if (initiator != to && initiator != from) {
      updateDayData(createOrUpdateLiquidityPosition(PROVIDER_NAME, poolAddress, initiator, ZERO_BI), initiator, event);
    }

    createTransferEvent(event, from, from, to, amt)
    createTransferEvent(event, to, from, to, amt)

  }
}

