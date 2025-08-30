import { Component } from '@angular/core';
import { VideoChatComponent } from './video-chat/video-chat.component';
import { CommonModule } from '@angular/common';

@Component({
  selector: 'app-root',
  imports: [VideoChatComponent],
  templateUrl: './app.component.html',
  styleUrl: './app.component.css'
})
export class AppComponent {
  title = 'WebRTC Learner';
}
