export type ElectronClientSession = {
  clientId: string;
  dispose: () => Promise<void>;
};

type RegisterClientResponse = {
  client_id: string;
};

export async function createElectronClientSession(
  baseUrl: string,
): Promise<ElectronClientSession> {
  const registerResponse = await fetch(`${baseUrl}/api/daemon/clients/register`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      client_type: "electron",
    }),
  });

  if (!registerResponse.ok) {
    throw new Error(`Failed to register Electron client (${registerResponse.status})`);
  }

  const payload = (await registerResponse.json()) as RegisterClientResponse;
  const clientId = payload.client_id;

  const interval = setInterval(() => {
    void fetch(`${baseUrl}/api/daemon/clients/${clientId}/heartbeat`, {
      method: "POST",
    });
  }, 1_000);

  return {
    clientId,
    async dispose() {
      clearInterval(interval);
      await fetch(`${baseUrl}/api/daemon/clients/${clientId}`, {
        method: "DELETE",
      }).catch(() => undefined);
    },
  };
}
