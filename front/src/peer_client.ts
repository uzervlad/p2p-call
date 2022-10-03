import { Peer, MediaConnection } from "peerjs";
import Call from "./call";
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

  private currentCall: Call | null = null;

  private localStream: MediaStream | null = null;

  private ws = new WebSocket(`wss://${document.location.hostname}:9001/ws`);

  private clients: string[] = [];

  constructor() {
    this.peer.on('open', id => {
      console.log(`Connected to P2P server, id: ${id}`);
      this.updateClients();
    });

    this.peer.on('connection', connection => {
      console.log(`DataConnection from ${connection.peer}`);

      connection.on('data', (data) => {
        if(data == 'call') {
          console.log(this.currentCall);
          
          if(this.currentCall) {
            connection.send('no');
            connection.close();

            return;
          }

          let answer = confirm(`Accept call from ${connection.peer}?`);
          if(answer) {
            connection.send('yes');

            this.peer.once('call', (call) => {
              document.body.classList.add("incall");

              this.currentCall = new Call(connection, call);

              this.processCall(this.currentCall);

              getUserMedia({ video: true, audio: true }).then(stream => {
                this.localStream = stream;

                this.displayLocalVideo(stream);

                this.currentCall!.answer(stream);
              });
            });
          } else {
            connection.send('no');
            connection.close();
          }
        }
      });
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

  private displayLocalVideo(stream: MediaStream) {
    this.elements.video.local.pause();
    this.elements.video.local.srcObject = stream;
    this.elements.video.local.play();
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
  }

  private call(id: string) {
    if(this.currentCall) throw "Attempted to call while in another call";

    let connection = this.peer.connect(id);

    connection.once('open', () => {
      connection.send('call');
    });

    connection.once('data', (data) => {
      if(data == 'no') {
        connection.close();
        alert('Call declined');
      } else if(data == 'yes') {
        document.body.classList.add("incall");

        console.log("Requesting user media");

        getUserMedia({ video: true, audio: true }).then(stream => {
          this.localStream = stream;

          this.displayLocalVideo(stream);

          let call = this.peer.call(id, stream);

          this.currentCall = new Call(connection, call);

          this.processCall(this.currentCall);
        });
      }
    });
  }

  private processCall(call: Call) {
    call.on('stream', (stream: MediaStream) => {
      this.elements.video.remote.pause();
      this.elements.video.remote.srcObject = stream;
      this.elements.video.remote.play();
    });
    call.on('close', () => {
      document.body.classList.remove("incall");
      this.currentCall = null;
      this.localStream?.getTracks().forEach(track => track.stop());
      this.localStream = null;
    });
  }

  private answerCall(call: MediaConnection, accept: boolean) {
    if(accept) {
      console.log("Requesting user media")

      document.body.classList.add("incall");

      getUserMedia({ video: true, audio: true }).then(stream => {
        this.elements.video.local.srcObject = stream;
        this.elements.video.local.play();

        // this.currentCall = call;

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

    this.currentCall.hangup();
  }
}