import fs from 'fs';
import path from 'path';

const ofwContent = `Message 1 of 3
This is a test message to verify OFW format handling.
The message should be properly chunked and maintain context.

Message 2 of 3
This is a reply to the previous message.
It should be detected as part of the same thread.
Let's make this one longer to test chunking.
Here's some more content to ensure we hit the token limit.

Message 3 of 3
A new message to test threading detection.
This one should start a new thread ID.`;

try {
  // Write files directly since directories already exist
  fs.writeFileSync(path.join('input', 'ofw', 'sample-ofw.txt'), ofwContent);
  console.log('Files written successfully');
} catch (error) {
  console.error('Error writing files:', error);
}
