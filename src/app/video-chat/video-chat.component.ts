import { Component, OnInit, OnDestroy } from '@angular/core';
import { Subscription, interval } from 'rxjs';
import { CommonModule } from '@angular/common';
import { WebRtcService } from './webrtcservice';

@Component({
  selector: 'app-video-chat',
  imports: [CommonModule],
  templateUrl: './video-chat.component.html',
  styleUrls: ['./video-chat.component.css']
})
export class VideoChatComponent implements OnInit, OnDestroy {
  localStream: MediaStream | undefined;
  remoteStream: MediaStream | undefined | null;
  incomingCall: any;
  inCall = false;
  otherClients: string[] = [];
  private clientPollSub: Subscription | undefined;

  constructor(private webrtcService: WebRtcService) { }

  async ngOnInit() {
    try {
      this.localStream = await this.webrtcService.getLocalStream();
      console.log('Local stream initialized:', this.localStream?.active);
      this.webrtcService.remoteStream$.subscribe((stream: MediaStream | undefined) => {
        console.log('Remote stream received:', stream);
        this.remoteStream = stream;
        this.inCall = true;
      });
      this.webrtcService.incomingCall$.subscribe((data: any) => {
        console.log('Incoming call:', data);
        this.incomingCall = data;
      });
      // Poll for clients every second
      this.clientPollSub = interval(1000).subscribe(() => {
        this.otherClients = this.webrtcService.getOtherClients();
        console.log('Updated clients:', this.otherClients);
      });
    } catch (error) {
      console.error('Error in ngOnInit:', error);
    }
  }

  ngOnDestroy() {
    if (this.clientPollSub) {
      this.clientPollSub.unsubscribe();
    }
    this.webrtcService.hangUp();
  }

  startCall(targetId: string) {
    this.webrtcService.startCall(targetId);
    this.inCall = true;
    console.log('Starting call to:', targetId);
  }

  acceptCall() {
    this.webrtcService.acceptCall(this.incomingCall);
    this.incomingCall = null;
    console.log('Call accepted');
  }

  hangUp() {
    this.webrtcService.hangUp();
    this.inCall = false;
    this.remoteStream = null;
    console.log('Call hung up');
  }
}