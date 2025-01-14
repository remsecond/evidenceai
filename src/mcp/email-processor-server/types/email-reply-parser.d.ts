declare module 'email-reply-parser' {
  interface EmailFragment {
    content: string;
    quoted: boolean;
    signature: boolean;
    hidden: boolean;
  }

  interface Email {
    fragments: EmailFragment[];
    read(text: string): Email;
  }

  class EmailReplyParser {
    read(text: string): Email;
  }

  export default EmailReplyParser;
}
