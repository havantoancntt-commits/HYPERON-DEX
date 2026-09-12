/**
 * HYPERON-DEX UNIFIED FINANCIAL-GRADE MATHEMATICS ENGINE
 * Production-grade, zero-floating-point fixed-point arithmetic for DEX settlement,
 * routing optimization, oracle consensus, and gas estimation.
 *
 * Core Guarantees:
 * 1. Absolute zero floating-point arithmetic (no `Number`, `parseFloat`, `Math.round` in financial-critical paths).
 * 2. Standardized USD price representation: Fixed-point with 8 decimals (USD_PRICE_DECIMALS = 8), aligned with Chainlink feeds.
 * 3. Formal rounding directions:
 *    - Output amounts, minimum received: Round DOWN (floor)
 *    - Required inputs, protocol fees: Round UP (ceil)
 * 4. Strict overflow / underflow checking with 512-bit intermediate registers.
 */

export class FinancialMathError extends Error {
  constructor(message: string, public readonly code: string) {
    super(`[FinancialMath Error: ${code}] ${message}`);
    this.name = 'FinancialMathError';
  }
}

export const UINT512_MAX: bigint = (1n << 512n) - 1n;
export const UINT256_MAX: bigint = (1n << 256n) - 1n;

export const BPS_DIVISOR: bigint = 10_000n; // 1 BPS = 0.01%
export const SCALAR_18: bigint = 10n ** 18n;
export const SCALAR_8: bigint = 10n ** 8n;
export const SCALAR_6: bigint = 10n ** 6n;
export const USD_PRICE_DECIMALS: number = 8;
export const SCALAR_USD: bigint = 10n ** BigInt(USD_PRICE_DECIMALS);

/**
 * Basic BigInt Math operations with safe bounds.
 */
export class BigIntMath {
  public static max(a: bigint, b: bigint): bigint {
    return a >= b ? a : b;
  }

  public static min(a: bigint, b: bigint): bigint {
    return a <= b ? a : b;
  }

  public static abs(a: bigint): bigint {
    return a >= 0n ? a : -a;
  }

  /**
   * Safe 512-bit addition.
   */
  public static add(a: bigint, b: bigint): bigint {
    const res = a + b;
    if (res < 0n || res > UINT512_MAX) {
      throw new FinancialMathError('512-bit overflow in addition', 'OVERFLOW');
    }
    return res;
  }

  /**
   * Safe 512-bit subtraction.
   */
  public static sub(a: bigint, b: bigint): bigint {
    if (a < b) {
      throw new FinancialMathError(`Underflow in subtraction: ${a} < ${b}`, 'UNDERFLOW');
    }
    return a - b;
  }

  /**
   * Safe 512-bit multiplication.
   */
  public static mul(a: bigint, b: bigint): bigint {
    const res = a * b;
    if (res < 0n || res > UINT512_MAX) {
      throw new FinancialMathError('512-bit overflow in multiplication', 'OVERFLOW');
    }
    return res;
  }

  /**
   * Safe 512-bit division (floor).
   */
  public static div(a: bigint, b: bigint): bigint {
    if (b === 0n) {
      throw new FinancialMathError('Division by zero in div', 'DIVISION_BY_ZERO');
    }
    return a / b;
  }

  /**
   * Full-precision mulDiv with Round DOWN (floor((a * b) / denominator)).
   */
  public static mulDivDown(a: bigint, b: bigint, denominator: bigint): bigint {
    if (denominator === 0n) {
      throw new FinancialMathError('Denominator cannot be zero in mulDivDown', 'DIVISION_BY_ZERO');
    }
    const intermediate = a * b;
    return intermediate / denominator;
  }

  /**
   * Full-precision mulDiv with Round UP (ceil((a * b) / denominator)).
   */
  public static mulDivUp(a: bigint, b: bigint, denominator: bigint): bigint {
    if (denominator === 0n) {
      throw new FinancialMathError('Denominator cannot be zero in mulDivUp', 'DIVISION_BY_ZERO');
    }
    const prod = a * b;
    if (prod === 0n) return 0n;
    return (prod - 1n) / denominator + 1n;
  }

  /**
   * Integer square root (Babylonian method) returning floor(sqrt(y)).
   */
  public static sqrt(y: bigint): bigint {
    if (y < 0n) {
      throw new FinancialMathError('Cannot calculate square root of negative number', 'NEGATIVE_SQRT');
    }
    if (y === 0n) return 0n;
    if (y < 4n) return 1n;

    let z = y;
    let x = y / 2n + 1n;
    while (x < z) {
      z = x;
      x = (y / x + x) / 2n;
    }
    return z;
  }
}

/**
 * Exact decimal string parsing and formatting without floating-point inaccuracies.
 */
export class DecimalMath {
  /**
   * Parses string representation of a decimal number directly into exact BigInt scaled by `decimals`.
   * Truncates excess fractional digits past `decimals` (Round DOWN).
   */
  public static parseExactDecimal(valueStr: string | number, decimals: number): bigint {
    if (decimals < 0 || decimals > 36) {
      throw new FinancialMathError(`Invalid decimals: ${decimals}`, 'INVALID_DECIMALS');
    }
    const str = String(valueStr || '').trim();
    if (!str || !/^\d+(\.\d+)?$/.test(str)) {
      throw new FinancialMathError(`Invalid decimal string: '${valueStr}'`, 'INVALID_DECIMAL_FORMAT');
    }

    const [integerPart, fractionalPart = ''] = str.split('.');
    const cleanInteger = BigInt(integerPart);
    const scale = 10n ** BigInt(decimals);

    if (fractionalPart.length === 0) {
      return cleanInteger * scale;
    }

    let adjustedFraction = fractionalPart;
    if (fractionalPart.length > decimals) {
      adjustedFraction = fractionalPart.slice(0, decimals);
    } else if (fractionalPart.length < decimals) {
      adjustedFraction = fractionalPart.padEnd(decimals, '0');
    }

    const fractionVal = BigInt(adjustedFraction);
    return cleanInteger * scale + fractionVal;
  }

  /**
   * Formats BigInt raw value into exact standard decimal string representation without float conversion.
   * `maxFractionDigits` optionally truncates trailing decimals for presentation.
   */
  public static formatExactDecimal(raw: bigint, decimals: number, maxFractionDigits?: number): string {
    if (decimals < 0 || decimals > 36) {
      throw new FinancialMathError(`Invalid decimals: ${decimals}`, 'INVALID_DECIMALS');
    }
    if (decimals === 0) {
      return raw.toString();
    }
    const scale = 10n ** BigInt(decimals);
    const isNegative = raw < 0n;
    const absVal = isNegative ? -raw : raw;

    const integerPart = absVal / scale;
    const remainder = absVal % scale;

    if (remainder === 0n) {
      return `${isNegative ? '-' : ''}${integerPart.toString()}`;
    }

    let remainderStr = remainder.toString().padStart(decimals, '0').replace(/0+$/, '');
    if (maxFractionDigits !== undefined && maxFractionDigits >= 0 && remainderStr.length > maxFractionDigits) {
      remainderStr = remainderStr.slice(0, maxFractionDigits).replace(/0+$/, '');
      if (remainderStr.length === 0) {
        return `${isNegative ? '-' : ''}${integerPart.toString()}`;
      }
    }

    return `${isNegative ? '-' : ''}${integerPart.toString()}.${remainderStr}`;
  }

  /**
   * Normalizes raw token amount from its native decimals to a target scale (default 18).
   */
  public static scaleToDecimals(amountRaw: bigint, sourceDecimals: number, targetDecimals: number): bigint {
    if (sourceDecimals === targetDecimals) return amountRaw;
    if (sourceDecimals < targetDecimals) {
      const shift = 10n ** BigInt(targetDecimals - sourceDecimals);
      return amountRaw * shift;
    } else {
      const shift = 10n ** BigInt(sourceDecimals - targetDecimals);
      return amountRaw / shift;
    }
  }
}

/**
 * Fixed-point conversions and standardized token scale transformations.
 */
export class FixedPoint {
  public static to18(amountRaw: bigint, decimals: number): bigint {
    return DecimalMath.scaleToDecimals(amountRaw, decimals, 18);
  }

  public static from18(amount18: bigint, decimals: number): bigint {
    return DecimalMath.scaleToDecimals(amount18, 18, decimals);
  }

  public static toUsdPriceRaw(priceStr: string | number): bigint {
    return DecimalMath.parseExactDecimal(priceStr, USD_PRICE_DECIMALS);
  }

  public static formatUsdPrice(priceRaw: bigint, maxFractionDigits: number = 4): string {
    return DecimalMath.formatExactDecimal(priceRaw, USD_PRICE_DECIMALS, maxFractionDigits);
  }
}

/**
 * High-precision financial pricing, slippage, and price impact calculations.
 */
export class PriceMath {
  /**
   * Calculates total USD value of a token amount in exact raw USD (8 decimals).
   * usdValueRaw = (amountRaw * priceUsdRaw) / (10^tokenDecimals)
   */
  public static calculateValueUsdRaw(amountRaw: bigint, tokenDecimals: number, priceUsdRaw: bigint): bigint {
    if (amountRaw <= 0n || priceUsdRaw <= 0n) return 0n;
    const tokenScale = 10n ** BigInt(tokenDecimals);
    return BigIntMath.mulDivDown(amountRaw, priceUsdRaw, tokenScale);
  }

  /**
   * Calculates minimum output bounded by slippage basis points (e.g. 50 BPS = 0.50%).
   * minOutput = (expectedOutput * (10000 - slippageBps)) / 10000
   */
  public static calculateMinimumReceived(expectedOutput: bigint, slippageBps: bigint | number): bigint {
    const bps = typeof slippageBps === 'bigint' ? slippageBps : BigInt(slippageBps);
    if (bps < 0n || bps > 10_000n) {
      throw new FinancialMathError(`Invalid slippage BPS: ${bps}`, 'INVALID_SLIPPAGE');
    }
    const factor = 10_000n - bps;
    return BigIntMath.mulDivDown(expectedOutput, factor, BPS_DIVISOR);
  }

  /**
   * Price impact calculation in basis points (10000 BPS = 100.00%).
   * impactBps = ((spotOutput - actualOutput) * 10000) / spotOutput
   */
  public static calculatePriceImpactBps(spotOutput: bigint, actualOutput: bigint): bigint {
    if (spotOutput <= 0n || actualOutput >= spotOutput) {
      return 0n;
    }
    const diff = spotOutput - actualOutput;
    return BigIntMath.mulDivDown(diff, BPS_DIVISOR, spotOutput);
  }

  /**
   * Price difference between two prices in basis points.
   */
  public static calculatePriceChangeBps(basePriceRaw: bigint, currentPriceRaw: bigint): bigint {
    if (basePriceRaw <= 0n) return 0n;
    const diff = currentPriceRaw > basePriceRaw ? currentPriceRaw - basePriceRaw : basePriceRaw - currentPriceRaw;
    return BigIntMath.mulDivDown(diff, BPS_DIVISOR, basePriceRaw);
  }
}

/**
 * Pure integer gas calculations for EIP-1559 and legacy EVM transactions.
 */
export class GasMath {
  /**
   * Computes effective gas price in Wei according to EIP-1559 specifications:
   * effectiveGasPrice = min(baseFeePerGas + maxPriorityFeePerGas, maxFeePerGas)
   */
  public static calculateEffectiveGasPriceWei(
    baseFeeWei: bigint,
    priorityFeeWei: bigint,
    maxFeeWei?: bigint
  ): bigint {
    const effective = baseFeeWei + priorityFeeWei;
    if (maxFeeWei !== undefined && maxFeeWei > 0n && effective > maxFeeWei) {
      return maxFeeWei;
    }
    return effective;
  }

  /**
   * Computes total gas cost in Wei.
   * totalCostWei = gasUnits * gasPriceWei
   */
  public static calculateTotalGasCostWei(gasUnits: bigint | number, gasPriceWei: bigint): bigint {
    const units = typeof gasUnits === 'bigint' ? gasUnits : BigInt(gasUnits);
    return units * gasPriceWei;
  }

  /**
   * Computes gas cost denominated in tokenOut raw units without any floating-point arithmetic.
   * Both `nativePriceUsdRaw` and `tokenOutPriceUsdRaw` are scaled by USD_PRICE_DECIMALS (8 decimals).
   */
  public static calculateGasCostInTokenOutRaw(
    gasUnits: bigint | number,
    gasPriceWei: bigint,
    nativePriceUsdRaw: bigint,
    tokenOutPriceUsdRaw: bigint,
    decimalsOut: number,
    isNativeOut: boolean = false
  ): bigint {
    const units = typeof gasUnits === 'bigint' ? gasUnits : BigInt(gasUnits);
    if (units <= 0n || gasPriceWei <= 0n) return 0n;

    const gasWei = units * gasPriceWei;

    if (isNativeOut) {
      if (decimalsOut === 18) return gasWei;
      if (decimalsOut > 18) return gasWei * (10n ** BigInt(decimalsOut - 18));
      return gasWei / (10n ** BigInt(18 - decimalsOut));
    }

    if (nativePriceUsdRaw > 0n && tokenOutPriceUsdRaw > 0n) {
      const scaleFactorOut = 10n ** BigInt(decimalsOut);
      // numerator = gasWei * nativePriceUsdRaw * 10^decimalsOut
      // denominator = tokenOutPriceUsdRaw * 10^18
      const numerator = gasWei * nativePriceUsdRaw * scaleFactorOut;
      const denominator = tokenOutPriceUsdRaw * (10n ** 18n);
      if (denominator > 0n) {
        return numerator / denominator;
      }
    }

    return 0n;
  }
}
