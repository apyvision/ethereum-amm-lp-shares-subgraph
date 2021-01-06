import {
  BPoolSmart,
  Transfer
} from '../../generated/BalancerSmartPoolAmpl/BPoolSmart'
import {Address, BigDecimal, BigInt, log} from "@graphprotocol/graph-ts";
import {ADDRESS_ZERO, createException, createOrUpdate, updateDayData} from "../util";

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
    let lp = createOrUpdate(PROVIDER_NAME, poolAddress, userAddrs, numLpTokens, 'burn');
    updateDayData(lp, userAddrs, event);
  } else if (from.toHexString() == ADDRESS_ZERO) { // MINT
    log.warning("[BALSMART] MINT EVENT FOR {}: {} Tokens", [initiator.toHexString(), numLpTokens.toString()])
    let userAddrs = initiator;
    let lp = createOrUpdate(PROVIDER_NAME, poolAddress, userAddrs, numLpTokens, 'mint');
    updateDayData(lp, userAddrs, event);
  } else { // TRANSFER
    if (initiator == to) {
      let lp = createOrUpdate(PROVIDER_NAME, poolAddress, to, BPoolSmart.bind(poolAddress).balanceOf(to), 'transfer');
      updateDayData(lp, to, event);
    }
    if (initiator == from) {
      let lpFrom = createOrUpdate(PROVIDER_NAME, poolAddress, from, BPoolSmart.bind(poolAddress).balanceOf(from), 'transfer');
      updateDayData(lpFrom, from, event);
    }
  }
}

