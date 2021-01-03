/* eslint-disable prefer-const */
import {Address, BigDecimal, BigInt, ethereum} from '@graphprotocol/graph-ts'
import {Burn, Mint, Transfer} from '../../generated/templates/SushiswapPair/Pair'
import {ERC20} from '../../generated/templates/SushiswapPair/ERC20'
import {ADDRESS_ZERO, createException, createOrUpdate, updateDayData} from "../util";

let PROVIDER_NAME = "Sushiswap";

export function handleTransfer(event: Transfer): void {
  let uniV2TokenAddrs = event.address;
  let contract = ERC20.bind(uniV2TokenAddrs);

  let to = event.params.to as Address;
  let from = event.params.from as Address;

  if (to == uniV2TokenAddrs || from == uniV2TokenAddrs) {
    createException(uniV2TokenAddrs, event.transaction.hash, "Saw a transfer event going to or from itself. Please check!!!")
    return;
  }

  // this is the caller of the contract interaction
  let initiator = event.transaction.from;

  if (to.toHexString() == ADDRESS_ZERO) { // BURN
    let amt = event.params.value
    let from = initiator
    let lp = createOrUpdate(PROVIDER_NAME, uniV2TokenAddrs, from, amt, 'burn');
    updateDayData(lp, from, event);
  } else if (from.toHexString() == ADDRESS_ZERO) { // MINT
    let amt = event.params.value
    let from = initiator
    let lp = createOrUpdate(PROVIDER_NAME, uniV2TokenAddrs, from, amt, 'mint');
    updateDayData(lp, from, event);
  } else { // TRANSFER
    if (initiator == to) {
      let lp = createOrUpdate(PROVIDER_NAME, uniV2TokenAddrs, to, contract.balanceOf(to), 'transfer');
      updateDayData(lp, to, event);
    }
    if (initiator == from) {
      let lpFrom = createOrUpdate(PROVIDER_NAME, uniV2TokenAddrs, from, contract.balanceOf(from), 'transfer');
      updateDayData(lpFrom, from, event);
    }
  }

}

