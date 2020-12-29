import {
  FaaSPoolLite,
  Transfer
} from '../../generated/ValueBFactory/FaaSPoolLite'
import {Address, BigDecimal, BigInt, log} from "@graphprotocol/graph-ts";
import {LOG_NEW_POOL} from "../../generated/ValueBFactory/BFactory";
import {ValueBPool as BPoolTemplate} from '../../generated/templates'
import {ADDRESS_ZERO, createException, createOrUpdate, updateDayData} from "../util";

let PROVIDER_NAME = "VALUE"

export function handleNewPool(event: LOG_NEW_POOL): void {
  let poolAddress = event.params.pool;
  log.warning("[VALUE] Creating factory tracking for pair address: {}", [poolAddress.toHexString()])
  BPoolTemplate.create(poolAddress);
}

export function handleTransfer(event: Transfer): void {
  let poolAddress = event.address;
  let to = event.params.dst as Address;
  let from = event.params.src;

  if (to == poolAddress || from == poolAddress) {
    createException(poolAddress, event.transaction.hash, "Saw a transfer event going to or from itself. Please check!!!")
    return;
  }

  if (to.toHexString() == ADDRESS_ZERO) { // BURN
    let userAddrs = event.transaction.from;
    let lp = createOrUpdate(PROVIDER_NAME, poolAddress, userAddrs, event.params.amt, 'burn');
    updateDayData(lp, userAddrs, event);
  } else if (from.toHexString() == ADDRESS_ZERO) { // MINT
    let userAddrs = event.transaction.from;
    let lp = createOrUpdate(PROVIDER_NAME, poolAddress, userAddrs, event.params.amt, 'mint');
    updateDayData(lp, userAddrs, event);
  } else { // TRANSFER
    let lp = createOrUpdate(PROVIDER_NAME, poolAddress, to, FaaSPoolLite.bind(poolAddress).balanceOf(to), 'transfer');
    updateDayData(lp, to, event);
    let lpFrom = createOrUpdate(PROVIDER_NAME, poolAddress, from, FaaSPoolLite.bind(poolAddress).balanceOf(from), 'transfer');
    updateDayData(lpFrom, from, event);
  }

}
