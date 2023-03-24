export interface AppElements {
  video: {
    local: HTMLVideoElement;
    remote: HTMLVideoElement;
  },
  clients: HTMLDivElement;
  hangup: HTMLButtonElement;
  mute: HTMLButtonElement;
  hide: HTMLButtonElement;
}

export function getElements(): AppElements {
  return {
    video: {
      local: document.querySelector("video#local") as HTMLVideoElement,
      remote: document.querySelector("video#remote") as HTMLVideoElement
    },
    clients: document.querySelector(".clients") as HTMLDivElement,
    hangup: document.querySelector(".hangup") as HTMLButtonElement,
    mute: document.querySelector(".mute") as HTMLButtonElement,
    hide: document.querySelector(".hide") as HTMLButtonElement,
  }
}