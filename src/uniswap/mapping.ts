/* eslint-disable prefer-const */
import { BigInt, BigDecimal, ethereum, Address } from '@graphprotocol/graph-ts'
import {Mint, Burn, Transfer} from '../../generated/templates/UniswapPair/Pair'
import {ERC20} from '../../generated/templates/UniswapPair/ERC20'
import {log} from "@graphprotocol/graph-ts/index";
import {LiquidityPosition, User, UserLiquidityPositionDayData} from "../../generated/schema";
import {updateDayData} from "../util";

let BI_18 = BigInt.fromI32(18);
let ZERO_BI = BigInt.fromI32(0);
let ONE_BI = BigInt.fromI32(1);

function exponentToBigDecimal(decimals: BigInt): BigDecimal {
  let bd = BigDecimal.fromString('1');
  for (let i = ZERO_BI; i.lt(decimals as BigInt); i = i.plus(ONE_BI)) {
    bd = bd.times(BigDecimal.fromString('10'));
  }
  return bd;
}

function convertTokenToDecimal(tokenAmount: BigInt, exchangeDecimals: BigInt): BigDecimal {
  if (exchangeDecimals == ZERO_BI) {
    return tokenAmount.toBigDecimal();
  }
  return tokenAmount.toBigDecimal().div(exponentToBigDecimal(exchangeDecimals));
}

export function createOrUpdate(exchange: Address, userAddrs: Address, balance: BigInt, blockNumber: BigInt, isMintOrBurn: Boolean): LiquidityPosition {
  let userId = userAddrs.toHexString()

  let user = User.load(userId)
  if (user == null) {
    user = new User(userId)
    user.save()
  }

  let id = exchange
    .toHexString()
    .concat('-')
    .concat(userAddrs.toHexString())
  let lp = LiquidityPosition.load(id)
  if (lp === null) {
    log.error('LiquidityPosition was not found, creating new one', [id])


    lp = new LiquidityPosition(id)
    lp.poolAddress = exchange
    lp.user = user.id
    lp.poolProviderName = "Uniswap"
  }

  let bal = convertTokenToDecimal(balance, BI_18);
  lp.block = blockNumber;
  lp.balance = bal;
  if (isMintOrBurn) {
    lp.balanceFromMintBurn = bal;
  }
  lp.save()

  return lp as LiquidityPosition
}

export function handleMint(event: Mint): void {
  let blockNumber = event.block.number.toI32();
  let uniV2TokenAddrs = event.address;
  let contract = ERC20.bind(uniV2TokenAddrs);
  let userAddrs = event.transaction.from;
  let balance = contract.balanceOf(userAddrs);
  let lp = createOrUpdate(uniV2TokenAddrs, userAddrs, balance, blockNumber, true);
  updateDayData(lp, userAddrs, event);
}

export function handleBurn(event: Burn): void {
  let blockNumber = event.block.number.toI32();
  let uniV2TokenAddrs = event.address;
  let userAddrs = event.transaction.from;
  let contract = ERC20.bind(uniV2TokenAddrs);
  let balance = contract.balanceOf(userAddrs);
  let lp = createOrUpdate(uniV2TokenAddrs, userAddrs, balance, blockNumber, true);
  updateDayData(lp, userAddrs, event);
}

export function handleTransfer(event: Transfer): void {
  let uniV2TokenAddrs = event.address;
  let blockNumber = event.block.number.toI32();
  let contract = ERC20.bind(uniV2TokenAddrs);

  let to = event.transaction.to;
  let balance = contract.balanceOf(to);
  let lp = createOrUpdate(uniV2TokenAddrs, to, balance, blockNumber, false);
  updateDayData(lp, to, event);

  let from = event.transaction.from;
  let balanceFrom = contract.balanceOf(from);
  let lpFrom = createOrUpdate(uniV2TokenAddrs, from, balance, blockNumber, false);
  updateDayData(lpFrom, from, event);
}

