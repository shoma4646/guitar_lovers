import { QueryClient } from "@tanstack/react-query";
import { subscribeReminderSync } from "../reminderSyncSubscription";

function runMutation(queryClient: QueryClient, mutationFn: () => Promise<unknown>) {
  return queryClient
    .getMutationCache()
    .build(queryClient, { mutationFn })
    .execute(undefined)
    .catch(() => undefined);
}

describe("subscribeReminderSync", () => {
  let queryClient: QueryClient;
  let sync: jest.Mock;

  beforeEach(() => {
    queryClient = new QueryClient();
    sync = jest.fn();
  });

  it("mutationが成功するたびに1回だけ呼ぶ", async () => {
    subscribeReminderSync(queryClient, sync);

    await runMutation(queryClient, async () => "saved");
    await runMutation(queryClient, async () => "saved again");

    expect(sync).toHaveBeenCalledTimes(2);
  });

  it("mutationが失敗したときは呼ばない", async () => {
    subscribeReminderSync(queryClient, sync);

    await runMutation(queryClient, async () => {
      throw new Error("保存失敗");
    });

    expect(sync).not.toHaveBeenCalled();
  });

  it("解除後は呼ばない", async () => {
    const unsubscribe = subscribeReminderSync(queryClient, sync);
    unsubscribe();

    await runMutation(queryClient, async () => "saved");

    expect(sync).not.toHaveBeenCalled();
  });
});
