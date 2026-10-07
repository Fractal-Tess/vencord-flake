import type { IpcMainInvokeEvent } from "electron";

const ATTEMPTS = 3;

// Runs in the main process, where Discord's content security policy does not apply.
export async function forward(_: IpcMainInvokeEvent, url: string, secret: string, payload: string) {
	let failure = "";
	for (let attempt = 1; attempt <= ATTEMPTS; attempt++) {
		try {
			const response = await fetch(url, {
				method: "POST",
				headers: { "content-type": "application/json", authorization: `Bearer ${secret}` },
				body: payload
			});
			if (response.ok) return { ok: true, error: "" };
			failure = `${response.status} ${await response.text()}`;
			// A rejected message will be rejected again.
			if (response.status < 500) break;
		} catch (error) {
			failure = String(error);
		}
		if (attempt < ATTEMPTS) await new Promise(resolve => setTimeout(resolve, 1000 * attempt));
	}
	return { ok: false, error: failure };
}
