import * as Y from 'yjs';
import * as awarenessProtocol from 'y-protocols/awareness';

export class SupabaseBroadcastProvider {
  constructor(doc, supabase, channelName) {
    this.doc = doc;
    this.awareness = new awarenessProtocol.Awareness(doc);
    this.channel = supabase.channel(channelName, {
      config: {
        broadcast: { ack: false },
        presence: { key: channelName },
      },
    });

    this.onUpdate = this.onUpdate.bind(this);
    this.onAwarenessUpdate = this.onAwarenessUpdate.bind(this);
    this.listeners = { status: [] };

    this.doc.on('update', this.onUpdate);
    this.awareness.on('update', this.onAwarenessUpdate);

    this.channel
      .on('broadcast', { event: 'update' }, ({ payload }) => {
        try {
            Y.applyUpdate(this.doc, Uint8Array.from(payload), this);
        } catch(e) {
            console.error(e);
        }
      })
      .on('broadcast', { event: 'awareness' }, ({ payload }) => {
        try {
            awarenessProtocol.applyAwarenessUpdate(this.awareness, Uint8Array.from(payload), this);
        } catch(e) {
            console.error(e);
        }
      })
      .subscribe((status) => {
        if (status === 'SUBSCRIBED') {
          this.emit('status', [{ status: 'connected' }]);
          
          // Send current state
          const state = Y.encodeStateAsUpdate(this.doc);
          this.channel.send({
            type: 'broadcast',
            event: 'update',
            payload: Array.from(state),
          });
        } else {
          this.emit('status', [{ status: 'connecting' }]);
        }
      });
  }

  on(event, callback) {
    if (this.listeners[event]) {
      this.listeners[event].push(callback);
    }
  }

  emit(event, args) {
    if (this.listeners[event]) {
      this.listeners[event].forEach(cb => cb(args));
    }
  }

  onUpdate(update, origin) {
    if (origin !== this) {
      this.channel.send({
        type: 'broadcast',
        event: 'update',
        payload: Array.from(update),
      }).catch(console.error);
    }
  }

  onAwarenessUpdate({ added, updated, removed }, origin) {
    if (origin !== this) {
      const changedClients = added.concat(updated).concat(removed);
      const update = awarenessProtocol.encodeAwarenessUpdate(this.awareness, changedClients);
      this.channel.send({
        type: 'broadcast',
        event: 'awareness',
        payload: Array.from(update),
      }).catch(console.error);
    }
  }

  destroy() {
    this.doc.off('update', this.onUpdate);
    this.awareness.off('update', this.onAwarenessUpdate);
    this.channel.unsubscribe();
  }
}
