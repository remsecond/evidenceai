# Speaker Attribution Design

## The Problem

Using the Safeco payment example:
1. LLM correctly identified:
   - Payment dispute exists
   - Evidence was provided
   - Confirmation was given
   - Repeated denials occurred

2. BUT critically failed by:
   - Misattributing quotes to wrong speakers
   - Reversing who provided evidence
   - Confusing claim/counterclaim ownership
   - Mixing up acknowledgment sources

## Root Cause Analysis

1. **Context Loss**
   ```typescript
   // Current Processing
   const message = {
     content: "I am going to assume that this reply means you realize...",
     timestamp: "2024-01-01T10:00:00Z"
   };

   // Missing Critical Context
   const messageWithContext = {
     content: "I am going to assume that this reply means you realize...",
     timestamp: "2024-01-01T10:00:00Z",
     speaker: "Robert",
     inReplyTo: "previous_message_id",
     thread: "thread_id",
     role: "response",
     claimType: "counter_evidence"
   };
   ```

2. **Conversation Flow**
   ```typescript
   // Current Flow Tracking
   const thread = [message1, message2, message3];

   // Need Explicit Flow Tracking
   const conversationFlow = {
     thread: "payment_dispute_thread",
     participants: ["Robert", "Christine"],
     claims: [
       {
         id: "claim-1",
         text: "Safeco was not paid",
         speaker: "Christine",
         timestamp: "2024-01-01T09:00:00Z"
       },
       {
         id: "claim-2",
         text: "Evidence of payment provided",
         speaker: "Robert",
         timestamp: "2024-01-01T09:30:00Z",
         refutes: "claim-1",
         evidence: ["screenshot-1", "receipt-1"]
       }
     ],
     exchanges: [
       {
         id: "exchange-1",
         claim: "claim-1",
         response: "claim-2",
         resolution: {
           type: "evidence_provided",
           accepted: true,
           timestamp: "2024-01-01T10:00:00Z"
         }
       }
     ]
   };
   ```

## Solution Design

1. **Speaker Context Preservation**
   ```typescript
   interface SpeakerContext {
     // Identity
     id: string;
     name: string;
     role: "initiator" | "responder";
     
     // Claims
     claims: Array<{
       id: string;
       text: string;
       timestamp: string;
       type: "assertion" | "evidence" | "acknowledgment" | "denial";
       evidence?: string[];
       refutes?: string;
       supports?: string;
     }>;
     
     // Evidence Provided
     evidence: Array<{
       id: string;
       type: string;
       timestamp: string;
       supports: string[];
       acknowledged_by?: {
         speaker: string;
         timestamp: string;
         message: string;
       };
     }>;
     
     // Behavior Patterns
     patterns: Array<{
       type: "repetition" | "contradiction" | "acknowledgment" | "denial";
       frequency: number;
       examples: string[];
       impact: string;
     }>;
   }
   ```

2. **Conversation Flow Tracking**
   ```typescript
   interface ConversationFlow {
     // Thread Structure
     thread: {
       id: string;
       topic: string;
       start: string;
       end: string;
       participants: string[];
     };
     
     // Message Chain
     messages: Array<{
       id: string;
       speaker: string;
       timestamp: string;
       content: string;
       type: "claim" | "evidence" | "response";
       references: {
         quotes: Array<{
           text: string;
           source: string;
           speaker: string;
         }>;
         evidence: string[];
         previous_messages: string[];
       };
     }>;
     
     // Claim Tracking
     claims: Array<{
       id: string;
       speaker: string;
       text: string;
       timestamp: string;
       status: "active" | "refuted" | "supported" | "acknowledged";
       evidence: string[];
       responses: Array<{
         speaker: string;
         type: "accept" | "deny" | "counter";
         timestamp: string;
         evidence?: string[];
       }>;
     }>;
   }
   ```

3. **Evidence Attribution**
   ```typescript
   interface EvidenceAttribution {
     // Evidence Record
     evidence: {
       id: string;
       type: string;
       content: string;
       timestamp: string;
       provider: string;
     };
     
     // Usage Tracking
     usage: Array<{
       speaker: string;
       timestamp: string;
       purpose: "support" | "refute" | "acknowledge" | "deny";
       target_claim: string;
       context: string;
     }>;
     
     // Verification Chain
     verification: {
       provided_by: string;
       verified_by: string[];
       acknowledged_by: string[];
       disputed_by: string[];
       resolution: {
         status: "accepted" | "disputed" | "unresolved";
         timestamp: string;
         final_position: string;
       };
     };
   }
   ```

## Implementation Strategy

1. **Phase 1: Context Preservation**
   - Enhance message processing to maintain speaker identity
   - Track conversation threads with participant roles
   - Preserve quote attribution metadata
   - Build evidence ownership chains

2. **Phase 2: Flow Analysis**
   - Implement conversation flow tracking
   - Build claim/counterclaim relationships
   - Track evidence presentation sequence
   - Monitor acknowledgment patterns

3. **Phase 3: Attribution Enhancement**
   - Add speaker verification to quotes
   - Implement evidence chain validation
   - Create attribution confidence scoring
   - Build misattribution detection

## LLM Integration

1. **Enhanced Prompt Structure**
   ```typescript
   const promptTemplate = `
   Analyze the following conversation, paying careful attention to speaker attribution:

   Thread: ${thread.topic}
   Participants: ${thread.participants.join(', ')}

   For each quote, note:
   - Speaker: [Explicitly stated]
   - Context: [Message thread]
   - Evidence: [If provided]
   - Responses: [From other participants]

   Key Claims:
   ${claims.map(claim => `
     - "${claim.text}"
     - Made by: ${claim.speaker}
     - Evidence: ${claim.evidence.join(', ')}
     - Responses: ${formatResponses(claim.responses)}
   `).join('\n')}

   Provide analysis that:
   1. Maintains strict speaker attribution
   2. Tracks claim ownership
   3. Maps evidence to providers
   4. Notes acknowledgments/denials
   `;
   ```

2. **Attribution Validation**
   ```typescript
   interface AttributionValidator {
     // Validate quote attribution
     validateQuote(quote: string, speaker: string): Promise<{
       valid: boolean;
       confidence: number;
       context: string;
       evidence: string[];
     }>;
     
     // Check claim ownership
     validateClaim(claim: string, speaker: string): Promise<{
       valid: boolean;
       confidence: number;
       supporting_context: string[];
       contradicting_context: string[];
     }>;
     
     // Verify evidence chain
     validateEvidence(evidence: string, provider: string): Promise<{
       valid: boolean;
       confidence: number;
       verification_chain: string[];
       acknowledgments: string[];
     }>;
   }
   ```

## Success Metrics

1. **Attribution Accuracy**
   - Quote attribution accuracy > 99%
   - Claim ownership accuracy > 99%
   - Evidence chain accuracy > 99%
   - Speaker role accuracy > 99%

2. **Context Preservation**
   - Speaker identity preserved 100%
   - Conversation flow maintained 100%
   - Evidence chains complete 100%
   - Attribution metadata complete 100%

## Next Steps

1. **Immediate Actions**
   - Implement speaker context tracking
   - Add attribution metadata to messages
   - Build evidence ownership chains
   - Create attribution validation tests

2. **Short-term Goals**
   - Enhance conversation flow tracking
   - Implement claim ownership validation
   - Add evidence chain verification
   - Build attribution confidence scoring

3. **Long-term Vision**
   - Advanced speaker pattern recognition
   - Automated attribution correction
   - Cross-document attribution validation
   - Real-time misattribution detection
