import { Injectable } from '@angular/core';
import { io, Socket } from 'socket.io-client';
import { Subject } from 'rxjs';

@Injectable({
  providedIn: 'root'
})
export class WebRtcService {
  private socket: Socket;
  private peerConnection!: RTCPeerConnection;
  private localStream!: MediaStream;
  private remoteStream = new MediaStream();
  private clientId!: string;
  private otherClients: string[] = [];

  public remoteStream$ = new Subject<MediaStream>();
  public incomingCall$ = new Subject<any>();

  constructor() {
    this.socket = io('https://localhost:3000', {
      rejectUnauthorized: false,
      reconnection: true,
      reconnectionAttempts: 5
    });

    this.socket.on('connect', () => {
      this.clientId = this.socket.id ?? '';
      console.log('Socket connected:', this.clientId);
    });

    this.socket.on('connect_error', (error) => {
      console.error('Socket connection error:', error);
    });

    this.socket.on('new-client', (clientId) => {
      this.otherClients.push(clientId);
      console.log('New client:', clientId, 'Total clients:', this.otherClients);
    });

    this.socket.on('client-disconnected', (clientId) => {
      this.otherClients = this.otherClients.filter(id => id !== clientId);
      console.log('Client disconnected:', clientId, 'Remaining:', this.otherClients);
    });

    this.socket.on('offer', async (data) => {
      console.log('Received offer from:', data.from, 'Offer:', data.offer);
      this.incomingCall$.next({ offer: data.offer, from: data.from });
    });

    this.socket.on('answer', async (data) => {
      console.log('Received answer from:', data.from, 'Answer:', data.answer);
      await this.peerConnection?.setRemoteDescription(new RTCSessionDescription(data.answer));
    });

    this.socket.on('ice-candidate', async (data) => {
      console.log('Received ICE candidate from:', data.from, 'Candidate:', data.candidate);
      await this.peerConnection?.addIceCandidate(new RTCIceCandidate(data.candidate));
    });
  }

  async initPeerConnection() {
    const config = { iceServers: [{ urls: 'stun:stun.l.google.com:19302' }] };
    this.peerConnection = new RTCPeerConnection(config);

    this.peerConnection.onicecandidate = (event) => {
      if (event.candidate) {
        this.socket.emit('ice-candidate', { candidate: event.candidate, target: this.otherClients[0] });
        console.log('Sent ICE candidate to:', this.otherClients[0]);
      }
    };

    this.peerConnection.ontrack = (event) => {
      console.log('Received remote track:', event.streams[0]);
      event.streams[0].getTracks().forEach(track => this.remoteStream.addTrack(track));
      this.remoteStream$.next(this.remoteStream);
    };
  }

  async getLocalStream() {
    try {
      this.localStream = await navigator.mediaDevices.getUserMedia({ video: true, audio: true });
      console.log('Local stream initialized:', this.localStream.active);
      return this.localStream;
    } catch (error) {
      console.error('Error getting local stream:', error);
      throw error;
    }
  }

  async startCall(targetId: string) {
    if (!targetId) {
      console.error('No target ID provided for call');
      return;
    }
    await this.initPeerConnection();
    this.localStream?.getTracks().forEach(track => this.peerConnection?.addTrack(track, this.localStream));
    const offer = await this.peerConnection.createOffer();
    await this.peerConnection.setLocalDescription(offer);
    this.socket.emit('offer', { offer, target: targetId });
    console.log('Sent offer to:', targetId);
  }

  async acceptCall(data: any) {
    if (!data || !data.offer || !data.from) {
      console.error('Invalid call data:', data);
      return;
    }
    await this.initPeerConnection();
    await this.peerConnection.setRemoteDescription(new RTCSessionDescription(data.offer));
    this.localStream.getTracks().forEach(track => this.peerConnection.addTrack(track, this.localStream));
    const answer = await this.peerConnection.createAnswer();
    await this.peerConnection.setLocalDescription(answer);
    this.socket.emit('answer', { answer, target: data.from });
    console.log('Sent answer to:', data.from);
  }

  hangUp() {
    if (this.peerConnection) {
      this.peerConnection.close();
    }
    if (this.localStream) {
      this.localStream.getTracks().forEach(track => track.stop());
    }
    this.remoteStream = new MediaStream();
    console.log('Call hung up');
  }

  getOtherClients() {
    return this.otherClients;
  }
}

