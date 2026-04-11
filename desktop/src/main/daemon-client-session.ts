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
  let currentClientId = "";
  let disposed = false;
  let heartbeatInFlight: Promise<void> | null = null;

  async function registerClient(clientId?: string): Promise<string> {
    const registerResponse = await fetch(`${baseUrl}/api/daemon/clients/register`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        client_type: "electron",
        ...(clientId ? { client_id: clientId } : {}),
      }),
    });

    if (!registerResponse.ok) {
      throw new Error(`Failed to register Electron client (${registerResponse.status})`);
    }

    const payload = (await registerResponse.json()) as RegisterClientResponse;
    currentClientId = payload.client_id;
    return currentClientId;
  }

  async function sendHeartbeat(): Promise<void> {
    if (!currentClientId || disposed) {
      return;
    }

    const response = await fetch(`${baseUrl}/api/daemon/clients/${currentClientId}/heartbeat`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        client_type: "electron",
      }),
    });

    if (response.status === 404 && !disposed) {
      await registerClient(currentClientId);
    }
  }

  await registerClient();

  const interval = setInterval(() => {
    if (heartbeatInFlight) {
      return heartbeatInFlight;
    }
    heartbeatInFlight = sendHeartbeat()
      .catch(() => undefined)
      .finally(() => {
        heartbeatInFlight = null;
      });
    return heartbeatInFlight;
  }, 1_000);

  return {
    get clientId() {
      return currentClientId;
    },
    async dispose() {
      disposed = true;
      clearInterval(interval);
      await fetch(`${baseUrl}/api/daemon/clients/${currentClientId}`, {
        method: "DELETE",
      }).catch(() => undefined);
    },
  };
}
