# Understanding Content Correlation in EvidenceAI

## What is Content Correlation?

Think of content correlation like a detective connecting the dots between different pieces of evidence. When you have multiple documents (PDFs, emails, etc.), some might contain the same or similar information. Our correlation system helps find these connections automatically.

## How Does It Work?

### 1. Finding Exact Matches

Imagine you have the same paragraph appearing in both a PDF and an email. The system will:
- Clean up the text (remove extra spaces, make everything lowercase)
- Create a unique "fingerprint" (hash) of the content
- When it finds identical fingerprints, it knows it's found the same content

Example:
```
PDF: "The meeting is scheduled for Tuesday at 2 PM"
Email: "The meeting is scheduled for Tuesday at 2 PM"
Result: ✓ Exact match found! (100% confidence)
```

### 2. Finding Similar Content

Sometimes content isn't exactly the same, but very similar. The system handles this by:
- Breaking content into smaller chunks
- Looking for matching chunks
- Calculating how similar they are (as a percentage)

Example:
```
PDF: "The meeting is scheduled for Tuesday at 2 PM in Room 101"
Email: "The meeting will be on Tuesday at 2 PM"
Result: ✓ Similar match found! (80% confidence)
```

### 3. Real-Time Feedback

When processing a document, you'll see something like this:

```
Content Correlations Found:
- EXACT match (100% confidence) with email from john@company.com
- SIMILAR match (85% confidence) with meeting-notes.pdf
- SIMILAR match (70% confidence) with presentation.pdf

Statistics:
- 3 related documents found
- 2 different source types (email, pdf)
- Part of a correlation cluster with 3 documents
```

### 4. What Can You Do With This?

1. **Track Information Flow**
   - See how information spreads across different documents
   - Find where a piece of information first appeared
   - Identify all places where similar information exists

2. **Build Evidence Chains**
   - Connect related pieces of information
   - See how information evolves over time
   - Verify information across multiple sources

3. **Analyze Patterns**
   - See which documents are most frequently related
   - Identify key documents that contain important information
   - Find clusters of related content

## Example Scenario

Let's say you're investigating a series of communications:

1. You scan a PDF of a meeting agenda
2. The system immediately tells you:
   - "Found similar content in an email from last week"
   - "Found an exact match in another PDF"
   - "These 3 documents form a correlation cluster"

3. You can then:
   - See when each version appeared
   - Track how the information changed
   - Identify who was involved in each document
   - Build a timeline of the information flow

## Benefits

1. **Save Time**
   - Automatically find related content
   - No need to manually search through documents
   - Instant notification when correlations are found

2. **Improve Accuracy**
   - Verify information across multiple sources
   - Track changes in information over time
   - Identify inconsistencies

3. **Better Understanding**
   - See how information is connected
   - Understand information flow
   - Identify key documents and patterns

## Using the System

Every time you process a document, the system will:
1. Extract the content
2. Look for matches (exact and similar)
3. Show you any correlations found
4. Update the correlation statistics
5. Save everything in easy-to-read logs

The system does this automatically - you just process documents normally, and it handles all the correlation work in the background.
