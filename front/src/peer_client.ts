import { Peer, MediaConnection } from "peerjs";
import { AppElements, getElements } from "./elements";

import { getUserMedia } from "./util";

export default class PeerClient {
  private peer = new Peer({
    host: "/",
    port: 9002,
    path: '/peer',
    secure: true,
  });

  private elements: AppElements = getElements();

  private currentCall: MediaConnection | null = null;

  private ws = new WebSocket(`wss://${document.location.hostname}:9001/ws`);

  private clients: string[] = [];

  constructor() {
    this.peer.on('open', id => {
      console.log(`Connected to P2P server, id: ${id}`);
      this.updateClients();
    });

    this.peer.on('call', call => {
      console.log(`Received a call from ${call.peer}`);
      if(this.currentCall) {
        call.close();
        console.log("Automatically declined incoming call");

        return;
      }

      this.answerCall(call, confirm(`Accept call from ${call.peer}?`));
    });

    this.ws.onopen = () => {
      console.log("Connected to WS");
    };

    this.ws.onmessage = ({ data }) => {
      this.clients = data.split(',');
      if(this.peer.open)
        this.updateClients()
    };

    this.elements.hangup.addEventListener("click", () => {
      this.hangup();
    });
  }

  private updateClients() {
    this.elements.clients.innerHTML = "";

    for(let client of this.clients) {
      if(client == this.peer.id) continue;

      let div = document.createElement("div");
        div.innerText = client;
        div.classList.add("client");
        div.addEventListener("click", () => {
          this.call(client);
        });

      this.elements.clients.append(div);
    }
    // this.elements.clients
  }

  private call(id: string) {
    document.body.classList.add("incall");

    if(this.currentCall) throw "Attempted to call while in another call";

    console.log("Requesting user media");

    getUserMedia({ video: true, audio: true }).then(stream => {
      this.elements.video.local.srcObject = stream;
      this.elements.video.local.play();

      console.log("Initiating call");

      let call = this.peer.call(id, stream);
      this.currentCall = call;

      call.on('stream', remoteStream => {
        this.elements.video.remote.srcObject = remoteStream;
        this.elements.video.remote.play();
      });
      call.on('iceStateChanged', state => {
        console.log(state);
      });
      call.on('error', err => {
        console.log("Call error occured");
        console.error(err);
      });
      call.on('close', () => {
        console.log("Call ended");

        this.currentCall = null;

        this.elements.video.local.srcObject = null;
        this.elements.video.remote.srcObject = null;

        document.body.classList.remove("incall");

        // TODO: Properly end the call

        console.log("Call ended");
      });
    });
  }

  private answerCall(call: MediaConnection, accept: boolean) {
    if(accept) {
      console.log("Requesting user media")

      document.body.classList.add("incall");

      getUserMedia({ video: true, audio: true }).then(stream => {
        this.elements.video.local.srcObject = stream;
        this.elements.video.local.play();

        this.currentCall = call;

        call.answer(stream);

        call.on('stream', remoteStream => {
          console.log("Received stream");
          console.log("yey");

          this.elements.video.remote.pause();
          this.elements.video.remote.srcObject = remoteStream;
          this.elements.video.remote.play();
        });
        call.on('iceStateChanged', state => {
          console.log(state);
        });
        call.on('error', err => {
          console.log("Call error occured");
          console.error(err);
        });
        call.on('close', () => {
          console.log("Call ended");

          this.currentCall = null;

          this.elements.video.local.srcObject = null;
          this.elements.video.remote.srcObject = null;

          document.body.classList.remove("incall");
          
          // TODO: Properly end the call

          console.log("Call ended");
        });
      });
    } else {
      call.close();
      console.log("Manually declined incoming call");
    }
  }

  private hangup() {
    if(!this.currentCall)
      throw "Trying to hang up while not in a call";

    this.currentCall.close();
  }
}