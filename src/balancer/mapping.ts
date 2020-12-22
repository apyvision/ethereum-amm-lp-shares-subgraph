import {BPool, LOG_EXIT, LOG_JOIN, Transfer} from '../../generated/BFactory/BPool'
import {LiquidityPosition, User, UserLiquidityPositionDayData} from '../../generated/schema'
import {Address, BigDecimal, BigInt, log} from "@graphprotocol/graph-ts";
import {LOG_NEW_POOL} from "../../generated/BFactory/BFactory";
import {BalancerBPool as BPoolTemplate} from '../../generated/templates'
import {updateDayData} from "../util";

let BI_18 = BigInt.fromI32(18)
let ZERO_BI = BigInt.fromI32(0)
let ONE_BI = BigInt.fromI32(1)

function exponentToBigDecimal(decimals: BigInt): BigDecimal {
  let bd = BigDecimal.fromString('1')
  for (let i = ZERO_BI; i.lt(decimals as BigInt); i = i.plus(ONE_BI)) {
    bd = bd.times(BigDecimal.fromString('10'))
  }
  return bd
}

function convertTokenToDecimal(tokenAmount: BigInt, exchangeDecimals: BigInt): BigDecimal {
  if (exchangeDecimals == ZERO_BI) {
    return tokenAmount.toBigDecimal()
  }
  return tokenAmount.toBigDecimal().div(exponentToBigDecimal(exchangeDecimals))
}

function getLpId(poolAddress: Address, userAddress: Address): string {
  return poolAddress.toHexString().concat('-').concat(userAddress.toHexString());
}

function createOrUpdate(poolAddress: Address, tx: string, userAddrs: Address, isMintOrBurn: boolean): LiquidityPosition {
  let userId = userAddrs.toHex()
  let user = User.load(userId)
  if (user == null) {
    user = new User(userId)
    user.save()
  }

  let lpId = getLpId(poolAddress, userAddrs)
  let lp = LiquidityPosition.load(lpId)
  if (lp == null) {
    lp = new LiquidityPosition(lpId)
    lp.user = user.id
    lp.poolProviderName = "Balancer"
    lp.poolAddress = poolAddress
    lp.balanceFromMintBurn = ZERO_BI.toBigDecimal()
  }
  let bal = convertTokenToDecimal(BPool.bind(poolAddress).balanceOf(userAddrs), BI_18);
  lp.balance = bal
  if (isMintOrBurn) {
    lp.balanceFromMintBurn = bal
  }
  lp.save()
  return lp as LiquidityPosition
}

export function handleNewPool(event: LOG_NEW_POOL): void {
  let poolAddress = event.params.pool;
  let tx = event.transaction.hash.toHexString();
  let userAddrs = event.transaction.from;
  let lp = createOrUpdate(poolAddress, tx, userAddrs, true);
  updateDayData(lp, userAddrs, event);
  log.error("[BAL] Creating factory tracking for pair: {}", [poolAddress.toHexString()])
  BPoolTemplate.create(poolAddress);
}

export function handleJoin(event: LOG_JOIN): void {
  let poolAddress = event.address;
  let tx = event.transaction.hash.toHexString();
  let userAddrs = event.transaction.from;
  log.error("[BAL] handle join for tx: {}", [tx])
  let lp = createOrUpdate(poolAddress, tx, userAddrs, true);
  updateDayData(lp, userAddrs, event);
}

export function handleBurn(event: LOG_EXIT): void {
  let poolAddress = event.address;
  let tx = event.transaction.hash.toHexString();
  log.error("[BAL] handle burn for tx: {}", [tx])
  let userAddrs = event.transaction.from;
  let lp = createOrUpdate(poolAddress, tx, userAddrs, true);
  updateDayData(lp, userAddrs, event);
}

export function handleTransfer(event: Transfer): void {
  let poolAddress = event.address;
  let tx = event.transaction.hash.toHexString();
  log.error("[BAL] handle transfer for tx: {}", [tx])

  let from = event.transaction.from;
  if (from != poolAddress) {
    let lp = createOrUpdate(poolAddress, tx, from, false);
    updateDayData(lp, from, event);
  }

  let to = event.transaction.to;
  if (to != poolAddress) {
    let lp2 = createOrUpdate(poolAddress, tx, to as Address, false);
    updateDayData(lp2, to as Address, event);
  }
}

