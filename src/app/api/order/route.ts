import { NextRequest, NextResponse } from "next/server";
import ccxt from "ccxt";
import type { CCXTOrder } from "@/types";

export async function POST(req: NextRequest) {
  try {
    const { orders, apiKey, secret, env } = (await req.json()) as {
      orders: CCXTOrder[];
      apiKey: string;
      secret: string;
      env?: 'test' | 'production';
    };

    if (!apiKey || !secret) {
      return NextResponse.json(
        { error: "apiKey and secret required" },
        { status: 400 },
      );
    }
    if (!Array.isArray(orders) || orders.length === 0) {
      return NextResponse.json({ error: "orders required" }, { status: 400 });
    }

    const apiUrl = env === 'production'
      ? 'https://api.bydfi.com/api'
      : 'https://api.bydtms.com/api'

    const exchange = new ccxt.bydfi({
      apiKey,
      secret,
      enableRateLimit: true,
      // verbose: true,
      urls: {
        api: {
          public: apiUrl,
          private: apiUrl,
        },
      },
    });
    await exchange.loadMarkets();
    const results = [];

    for (const order of orders) {
      // BYDFi 使用 BTC-USDT 格式，标准 CCXT 符号为 BTC/USDT
      const symbol = order.symbol.replace("/", "-");

      // 按交易所精度要求格式化数量，并确保不低于最小下单量
      // 优先使用 MarketInfo.volumePrecision，fallback 到 CCXT amountToPrecision
      const market = exchange.market(symbol);
      const minAmount = market?.limits?.amount?.min ?? 1;
      const rawAmount = Math.max(order.amount, minAmount);
      const amount = order.volumePrecision != null
        ? parseFloat(rawAmount.toFixed(order.volumePrecision))
        : parseFloat(exchange.amountToPrecision(symbol, rawAmount));

      const placed = await exchange.createOrder(
        symbol,
        order.type,
        order.side,
        amount,
        order.price,
        order.params,
      );
      results.push({
        id: placed.id,
        symbol: placed.symbol,
        side: placed.side,
        amount: placed.amount,
        price: placed.price,
        status: placed.status,
        timestamp: placed.timestamp ?? Date.now(),
      });
    }

    return NextResponse.json({ results });
  } catch (err) {
    return NextResponse.json(
      { error: err instanceof Error ? err.message : "Order failed" },
      { status: 500 },
    );
  }
}
