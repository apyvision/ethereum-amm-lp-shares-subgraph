import {
  Exception,
  LiquidityPosition,
  User,
  UserLiquidityPositionDayData
} from "../generated/schema";
import {Address, BigDecimal, BigInt, Bytes, ethereum, log} from "@graphprotocol/graph-ts/index";

export const ADDRESS_ZERO = '0x0000000000000000000000000000000000000000'
export const BI_18 = BigInt.fromI32(18);
export const ZERO_BI = BigInt.fromI32(0);
export const ONE_BI = BigInt.fromI32(1);


export function updateDayData(lp: LiquidityPosition, userAddress: Address, event: ethereum.Event): UserLiquidityPositionDayData {
  let timestamp = event.block.timestamp.toI32()
  let dayID = timestamp / 86400
  let dayStartTimestamp = dayID * 86400
  let dayPairID = lp.id
    .concat('-')
    .concat(BigInt.fromI32(dayID).toString())
  let dayData = UserLiquidityPositionDayData.load(dayPairID)
  if (dayData === null) {
    dayData = new UserLiquidityPositionDayData(dayPairID)
    dayData.date = dayStartTimestamp
    dayData.poolProviderName = lp.poolProviderName
    dayData.poolAddress = lp.poolAddress
    dayData.userAddress = userAddress
  }

  dayData.balance = lp.balance
  dayData.balanceFromMintBurn = lp.balanceFromMintBurn
  dayData.save()

  return dayData as UserLiquidityPositionDayData
}

export function createException(addrs: Bytes, txHash: Bytes, message: string): void {
  let exception = new Exception(txHash.toHexString())
  exception.addrs = addrs
  exception.txHash = txHash
  exception.message = message
  exception.save()
}

export function exponentToBigDecimal(decimals: BigInt): BigDecimal {
  let bd = BigDecimal.fromString('1');
  for (let i = ZERO_BI; i.lt(decimals as BigInt); i = i.plus(ONE_BI)) {
    bd = bd.times(BigDecimal.fromString('10'));
  }
  return bd;
}

export function convertTokenToDecimal(tokenAmount: BigInt, exchangeDecimals: BigInt): BigDecimal {
  if (exchangeDecimals == ZERO_BI) {
    return tokenAmount.toBigDecimal();
  }
  return tokenAmount.toBigDecimal().div(exponentToBigDecimal(exchangeDecimals));
}

export function createOrUpdate(providerName: string, poolAddrs: Address, userAddrs: Address, val: BigInt, operation: string): LiquidityPosition {
  let userId = userAddrs.toHexString()

  let user = User.load(userId)
  if (user == null) {
    user = new User(userId)
    user.save()
  }

  let id = poolAddrs
    .toHexString()
    .concat('-')
    .concat(userAddrs.toHexString())
  let lp = LiquidityPosition.load(id)
  if (lp === null) {
    log.warning('LiquidityPosition was not found, creating new one', [id])
    lp = new LiquidityPosition(id)
    lp.poolAddress = poolAddrs
    lp.user = user.id
    lp.balanceFromMintBurn = ZERO_BI.toBigDecimal()
    lp.poolProviderName = providerName
  }

  let bal = convertTokenToDecimal(val, BI_18);
  lp.balance = bal;
  if (operation == 'mint') {
    lp.balanceFromMintBurn = lp.balanceFromMintBurn.plus(bal);
  } else if (operation == 'burn') {
    lp.balanceFromMintBurn = lp.balanceFromMintBurn.minus(bal);
  }
  lp.save()

  return lp as LiquidityPosition
}
