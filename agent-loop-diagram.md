# Agent Loop Flow Diagram

```mermaid
flowchart TD
    Start([User Query]) --> Guards{Safety & Clarification<br/>Checks}
    
    Guards -->|fail| Refuse[Return Refusal/Clarification]
    Guards -->|pass| Loop{Agent Loop<br/>step < 5?}
    
    Loop -->|false| FinalAnswer[Final Answer<br/>answerQuestion]
    Loop -->|true| NextAction[Get Next Action<br/>getNextAction]
    
    NextAction --> Decision{Action Type}
    
    Decision -->|continue| Search[Search & Scrape<br/>+ Summarize]
    Decision -->|answer| Answer[Stream Answer<br/>answerQuestion]
    
    Search --> Increment[Increment Step]
    Increment --> Loop
    
    %% Terminal states
    Refuse --> End([Exit])
    Answer --> End
    FinalAnswer --> End
    
    %% Styling
    classDef decision fill:#e1f5fe
    classDef process fill:#f3e5f5
    classDef terminal fill:#e8f5e8
    
    class Guards,Loop,Decision decision
    class Start,End terminal