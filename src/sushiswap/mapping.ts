/* eslint-disable prefer-const */
import {BigInt, BigDecimal, store, Address} from '@graphprotocol/graph-ts'
import {Mint, Burn} from '../../generated/templates/Pair/Pair'
import {ERC20} from '../../generated/templates/Pair/ERC20'
import {log} from "@graphprotocol/graph-ts/index";
import {LiquidityPosition, User} from "../../generated/schema";

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

export function createLiquidityPosition(exchange: Address, userAddrs: Address, balance: BigInt): LiquidityPosition {
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
    lp.poolProviderName = "Sushiswap"
  }

  lp.balance = convertTokenToDecimal(balance, BI_18);
  lp.save()

  return lp as LiquidityPosition
}

export function handleMint(event: Mint): void {
  let uniV2TokenAddrs = event.address;
  let contract = ERC20.bind(uniV2TokenAddrs);
  let userAddrs = event.transaction.from;
  let balance = contract.balanceOf(userAddrs);
  createLiquidityPosition(uniV2TokenAddrs, userAddrs, balance);
}

export function handleBurn(event: Burn): void {
  let uniV2TokenAddrs = event.address;
  let userAddrs = event.transaction.from;
  let contract = ERC20.bind(uniV2TokenAddrs);
  let balance = contract.balanceOf(userAddrs);
  createLiquidityPosition(uniV2TokenAddrs, userAddrs, balance);
}

