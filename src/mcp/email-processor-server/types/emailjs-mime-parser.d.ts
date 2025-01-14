declare module 'emailjs-mime-parser' {
  interface MimeNode {
    headers: Map<string, string>;
    content: Buffer;
    contentType: string;
    children: MimeNode[];
  }

  class MimeParser {
    write(chunk: string | Buffer): void;
    end(): void;
    onheader: (node: MimeNode) => void;
    onbody: (node: MimeNode) => void;
    onend: () => void;
  }

  export { MimeParser, MimeNode };
}
