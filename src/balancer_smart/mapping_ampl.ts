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

  if (to == poolAddress || from == poolAddress) {
    createException(poolAddress, event.transaction.hash, "Saw a transfer event going to or from itself. Please check!!!")
    return;
  }

  if (to.toHexString() == ADDRESS_ZERO) { // BURN
    let userAddrs = event.transaction.from;
    let lp = createOrUpdate(PROVIDER_NAME, poolAddress, userAddrs, event.params.value, 'burn');
    updateDayData(lp, userAddrs, event);
  } else if (from.toHexString() == ADDRESS_ZERO) { // MINT
    let userAddrs = event.transaction.from;
    let lp = createOrUpdate(PROVIDER_NAME, poolAddress, userAddrs, event.params.value, 'mint');
    updateDayData(lp, userAddrs, event);
  } else { // TRANSFER
    let lp = createOrUpdate(PROVIDER_NAME, poolAddress, to, BPoolSmart.bind(poolAddress).balanceOf(to), 'transfer');
    updateDayData(lp, to, event);
    let lpFrom = createOrUpdate(PROVIDER_NAME, poolAddress, from, BPoolSmart.bind(poolAddress).balanceOf(from), 'transfer');
    updateDayData(lpFrom, from, event);
  }
}

