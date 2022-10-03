import { EventEmitter } from "events";
import { DataConnection, MediaConnection } from "peerjs";

type CallEvent = {
  stream: (stream: MediaStream) => void;
  error: (err: Error) => void;
  close: () => void;
}

interface ICall {
  on<U extends keyof CallEvent>(event: U, listener: CallEvent[U]): this;
    
  off<U extends keyof CallEvent>(event: U, listener: CallEvent[U]): this;
  
  emit<U extends keyof CallEvent>(
      event: U,
      ...args: Parameters<CallEvent[U]>
  ): boolean;
}

export default class Call extends EventEmitter implements ICall {
  constructor(
    private data: DataConnection,
    private media: MediaConnection
  ) {
    super();

    data.on('data', (data) => {
      if(data == 'close') {
        this.hangup();
      }
    });

    media.on('stream', stream => {
      this.emit('stream', stream);
    });
    media.on('error', (err) => {
      this.emit('error', err);
      this.hangup();
    });
  }

  answer(stream: MediaStream) {
    this.media.answer(stream);
  }

  hangup() {
    this.data.send('close');
    setTimeout(() => {
      this.emit('close');
      this.data.close();
      this.media.close();
    }, 200);
  }
}