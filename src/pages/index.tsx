import Head from "next/head";
import { useEffect, useReducer } from "react";

const BOT_COOK_TIME = 10;

enum Actions {
  ADD_BOT = "ADD_BOT",
  ADD_ORDER = "ADD_ORDER",
  WITHDRAW_BOT = "WITHDRAW_BOT",
  ADD_COOK_TIME = "ADD_COOK_TIME",
}

interface POS {
  bots: Bot[];
  queue: Order[];
  bot_count: number;
  order_count: number;
}

type BotStatus = "idle" | "cooking";

interface Bot {
  id: string;
  status: BotStatus;
  handling_order: string | null;
  remaining_seconds: number | null;
}
type OrderStatus = "pending" | "completed" | "cooking";
type OrderType = "normal" | "vip";

interface Order {
  order_number: string;
  status: OrderStatus;
  type: OrderType;
  remaining_seconds: null | number;
}

type CommonAction = {
  type: typeof Actions.ADD_BOT | typeof Actions.ADD_COOK_TIME;
};

type AddOrderAction = {
  type: typeof Actions.ADD_ORDER;
  order_type: OrderType;
};

type WithdrawBotAction = {
  type: typeof Actions.WITHDRAW_BOT;
  bot_id: string;
};

const get_pending_order_and_idle_bot = (queue: Order[], bots: Bot[]) => {
  let order_idx = -1;
  let bot_idx = -1;
  if (queue.length > 0) {
    bot_idx = bots.findIndex((e) => e.status === "idle");
    if (bot_idx !== -1) {
      order_idx = queue.findIndex(
        (e) => e.type === "vip" && e.status === "pending"
      );
      if (order_idx === -1) {
        order_idx = queue.findIndex((e) => e.status === "pending");
      }
    }
  }

  return {
    order_idx,
    bot_idx,
  };
};

// will mutate the params
const assign_order_to_bot = (state: POS) => {
  const { order_idx, bot_idx } = get_pending_order_and_idle_bot(
    state.queue,
    state.bots
  );
  if (order_idx !== -1 && bot_idx !== -1) {
    state.queue[order_idx].status = "cooking";
    state.queue[order_idx].remaining_seconds = BOT_COOK_TIME;
    state.bots[bot_idx].status = "cooking";
    state.bots[bot_idx].remaining_seconds = BOT_COOK_TIME;
    state.bots[bot_idx].handling_order = state.queue[order_idx].order_number;
  }
};

const reducer = (
  state: POS,
  action: CommonAction | AddOrderAction | WithdrawBotAction
): POS => {
  // bad
  const new_state: POS = JSON.parse(JSON.stringify(state));
  switch (action.type) {
    case Actions.ADD_BOT: {
      const new_bot: Bot = {
        handling_order: null,
        id: `BT${(new_state.bot_count + 1).toString()}`,
        status: "idle",
        remaining_seconds: null,
      };
      new_state.bot_count++;
      new_state.bots.push(new_bot);
      assign_order_to_bot(new_state);
      return new_state;
    }
    case Actions.ADD_ORDER: {
      new_state.queue.push({
        order_number: `ON${(new_state.order_count + 1).toString()}`,
        status: "pending",
        type: action.order_type,
        remaining_seconds: null,
      });
      new_state.order_count++;
      assign_order_to_bot(new_state);
      return new_state;
    }
    case Actions.WITHDRAW_BOT: {
      const bot_idx = new_state.bots.findIndex((e) => e.id === action.bot_id);
      if (bot_idx !== -1) {
        const withdrawn_bots = new_state.bots.splice(bot_idx, 1);
        const bot = withdrawn_bots[0];
        if (bot.status === "cooking") {
          const order_idx = new_state.queue.findIndex(
            (e) => e.order_number === bot.handling_order
          );
          if (order_idx !== -1) {
            new_state.queue[order_idx].status = "pending";
            new_state.queue[order_idx].remaining_seconds = null;
          }
        }
      }
      return new_state;
    }
    case Actions.ADD_COOK_TIME: {
      let changed = 0;
      for (let i = 0; i < new_state.bots.length; i++) {
        const bot = new_state.bots[i];
        if (bot.status === "cooking") {
          changed++;
          const order_idx = new_state.queue.findIndex(
            (e) => e.order_number === bot.handling_order
          );
          let order: Order | undefined;
          if (order_idx !== -1) {
            order = new_state.queue[order_idx];
          }
          if (bot.remaining_seconds === 0) {
            if (order) {
              order.status = "completed";
              order.remaining_seconds = null;
            }
            bot.remaining_seconds = null;
            bot.status = "idle";
            bot.handling_order = null;
            assign_order_to_bot(new_state);
          } else {
            if (bot.remaining_seconds !== null) {
              bot.remaining_seconds--;
            }
            if (order && order.remaining_seconds !== null) {
              order.remaining_seconds--;
            }
          }
        }
      }
      if (!changed) {
        // return original state to avoid render
        return state;
      }
      return new_state;
    }
    default:
      return new_state;
  }
};

const initialState: POS = {
  bots: [],
  queue: [],
  bot_count: 0,
  order_count: 0,
};

const OrderBox = ({ order }: { order: Order }) => {
  return (
    <div
      key={order.order_number}
      style={{
        textAlign: "center",
        border: "1px solid red",
        padding: 6,
      }}
    >
      <h3>{`${order.order_number} [${order.type}]`}</h3>
      <p>{order.status}</p>
      {order.status === "cooking" && (
        <p>{`Time: ${order.remaining_seconds}s`}</p>
      )}
    </div>
  );
};

const OrderSection = ({ label, queue }: { label: string; queue: Order[] }) => {
  return (
    <fieldset
      style={{
        display: "flex",
        gap: 10,
        flexWrap: "wrap",
        margin: 10,
        padding: 10,
      }}
    >
      <legend>{label}</legend>
      {queue.map((order) => {
        return <OrderBox order={order} key={order.order_number} />;
      })}
    </fieldset>
  );
};

const usePos = () => {
  const [state, dispatch] = useReducer(reducer, initialState);

  useEffect(() => {
    const timer = setInterval(() => {
      dispatch({ type: Actions.ADD_COOK_TIME });
    }, 1000);
    return () => clearInterval(timer);
  }, []);

  const addBot = () => {
    dispatch({ type: Actions.ADD_BOT });
  };

  const addOrder = (order_type: OrderType) => {
    dispatch({ type: Actions.ADD_ORDER, order_type });
  };
  const withdrawBot = (bot_id: string) => {
    dispatch({ type: Actions.WITHDRAW_BOT, bot_id });
  };

  const pendingQueue = [
    ...state.queue.filter((e) => e.type === "vip" && e.status === "pending"),
    ...state.queue.filter((e) => e.type === "normal" && e.status === "pending"),
  ];
  const cookingQueue = state.queue.filter((e) => e.status === "cooking");

  const completedQueue = state.queue.filter((e) => e.status === "completed");

  return {
    bots: state.bots,
    completedQueue,
    cookingQueue,
    pendingQueue,
    addBot,
    addOrder,
    withdrawBot,
    queue: state.queue,
  };
};

export default function Home() {
  const {
    bots,
    pendingQueue,
    addBot,
    addOrder,
    withdrawBot,
    completedQueue,
    cookingQueue,
  } = usePos();
  return (
    <>
      <Head>
        <title>McD Bot POS</title>
        <meta name="description" content="Generated by create next app" />
        <meta name="viewport" content="width=device-width, initial-scale=1" />
        <link rel="icon" href="/favicon.ico" />
      </Head>
      <div>
        <div>
          <div style={{ display: "flex", gap: 10 }}>
            <h1>Bots</h1>
            <button onClick={addBot}>Add bot</button>
          </div>
          <div style={{ display: "flex", gap: 10, flexWrap: "wrap" }}>
            {bots.map((bot) => {
              return (
                <div
                  key={bot.id}
                  style={{
                    textAlign: "center",
                    border: "1px solid red",
                    padding: 6,
                  }}
                >
                  <button
                    onClick={() => {
                      withdrawBot(bot.id);
                    }}
                  >
                    Remove bot
                  </button>
                  <h3>{bot.id}</h3>
                  <p>
                    {bot.status}{" "}
                    {bot.status === "cooking" && `[${bot.handling_order}]`}
                  </p>
                  {bot.status === "cooking" && (
                    <p>{`Time: ${bot.remaining_seconds}s`}</p>
                  )}
                </div>
              );
            })}
          </div>
        </div>
        <br />
        <div>
          <div style={{ display: "flex", gap: 10 }}>
            <h1>Orders</h1>
            <button
              onClick={() => {
                addOrder("normal");
              }}
            >
              Add Normal Order
            </button>
            <button
              onClick={() => {
                addOrder("vip");
              }}
            >
              Add VIP Order
            </button>
          </div>
          <OrderSection label="Completed" queue={completedQueue} />
          <OrderSection label="Cooking" queue={cookingQueue} />
          <OrderSection label="Pending" queue={pendingQueue} />
        </div>
      </div>
    </>
  );
}
