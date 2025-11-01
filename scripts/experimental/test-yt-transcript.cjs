import { YoutubeTranscript } from 'youtube-transcript';

async function test() {
  try {
    console.log('Testing youtube-transcript with video jNQXAC9IVRw (Me at the zoo)...');
    const items = await YoutubeTranscript.fetchTranscript('jNQXAC9IVRw', { lang: 'en' });
    console.log('Success! Found', items.length, 'caption items');
    console.log('First 3 items:', items.slice(0, 3));
  } catch (e) {
    console.error('Error:', e.message);
  }
}

test();
