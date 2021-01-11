import {
  BPoolSmart,
  Transfer
} from '../../generated/BalancerSmartPoolAmpl/BPoolSmart'
import {Address, BigDecimal, BigInt, log} from "@graphprotocol/graph-ts";
import {
  ADDRESS_ZERO,
  createException,
  createOrUpdate,
  MINUS_ONE,
  updateDayData,
  ZERO_BI
} from "../util";

let PROVIDER_NAME = "Balancer"

export function handleTransfer(event: Transfer): void {
  let poolAddress = event.address;
  let to = event.params.to as Address;
  let from = event.params.from;
  let initiator = event.transaction.from;
  let numLpTokens = event.params.value;

  if (to.toHexString() == ADDRESS_ZERO) { // BURN
    log.warning("[BALSMART] BURN EVENT FOR {}: {} Tokens", [initiator.toHexString(), numLpTokens.toString()])
    let userAddrs = initiator;
    let lp = createOrUpdate(PROVIDER_NAME, poolAddress, userAddrs, numLpTokens.times(MINUS_ONE));
    updateDayData(lp, userAddrs, event);
  } else if (from.toHexString() == ADDRESS_ZERO) { // MINT
    log.warning("[BALSMART] MINT EVENT FOR {}: {} Tokens", [initiator.toHexString(), numLpTokens.toString()])
    let userAddrs = initiator;
    let lp = createOrUpdate(PROVIDER_NAME, poolAddress, userAddrs, numLpTokens);
    updateDayData(lp, userAddrs, event);
  } else { // TRANSFER
    if (initiator == to) {
      let lp = createOrUpdate(PROVIDER_NAME, poolAddress, to, ZERO_BI);
      updateDayData(lp, to, event);
    }
    if (initiator == from) {
      let lpFrom = createOrUpdate(PROVIDER_NAME, poolAddress, from, ZERO_BI);
      updateDayData(lpFrom, from, event);
    }
  }
}

