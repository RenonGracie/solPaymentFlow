### **`benefits_structure`**

**For ALL (yellow box):**

<aside>

"Based on your benefits, you can expect to pay ~`member_obligation` for your sessions." 

</aside>

**At a high level:**

→ if `benefits_structure` contains `“after deductible”` then show “Additional coverage details” panel by parsing into 2 situations:

1. Situation 1 (hit deductible) if otherwise
2. Situation 2 (haven’t hit deductible) `remaining_deductible > 0`

→ if `benefits_structure` doesn’t contain `“after deductible”` , don’t show any additional coverage details.

**`benefits_structure`** string options and logic:

- Copay, no deductible, with OOP Max
- Coinsurance **after deductible**, with OOP Max
    - Situation 1 (hit deductible)
        - Additional coverage details: You’ve already hit your deductible, so you’ll just pay your estimated coinsurance (your share of the session cost).
    - Situation 2 (haven’t hit deductible)
        
        <aside>
        
        - Additional coverage details: 
        
        You’ll pay this full session rate until you reach your deductible of `deductible`. You still have `remaining_deductible` left to go. After that, you’ll only pay `coinsurance` % of each session cost. 
        
        Need a lower rate? Talk to your therapist during the first session and we’ll find a session rate that works for you.
        </aside>
        
- Fully covered
    
    <aside>
    
    - Additional coverage details: "Great news—your sessions are fully covered by insurance. You won't owe anything."
    </aside>
    
- Fully covered after deductible
    - Situation 1 (hit deductible)
        - Additional coverage details: Great news—you've already hit your deductible, so your sessions are fully covered by insurance. You won't owe anything.
    - Situation 2 (haven’t hit deductible)
        - Additional coverage details: 
        
        You'll pay this full session rate until you reach your deductible of `deductible`. You still have `remaining_deductible` to go. After that, your sessions will be $0.
        
        Need a lower rate? Talk to your therapist during the first session and we’ll find a session rate that works for you.
- Copay after deductible, with OOP Max
    - Situation 1 (hit deductible)
        - Additional coverage details: You’ve already hit your deductible, so you’ll pay your copay of `copay` per session.
    - Situation 2 (haven’t hit deductible):
        - Additional coverage details: 
        
        You'll pay this full session rate until you reach your deductible of `deductible`. You still have `remaining_deductible` to go. After that, your cost drops to just your copay ($`copay`) per session.
        
        Need a lower rate? Talk to your therapist during the first session and we’ll find a session rate that works for you.
- Copay, no deductible, no OOP Max
- Coinsurance, no deductible, with OOP Max
- Coinsurance, no deductible, no OOP Max
- Copay after deductible, no OOP Max
    - Situation 1 (hit deductible)
        - Additional coverage details: You’ve already hit your deductible, so you’ll pay your copay of `copay` per session.
    - Situation 2 (haven’t hit deductible):
        - Additional coverage details: 
        
        You'll pay this full session rate until you reach your deductible of `deductible`. You still have `remaining_deductible` to go. After that, your cost drops to just your copay ($`copay`) per session.
        
        Need a lower rate? Talk to your therapist during the first session and we’ll find a session rate that works for you.
- Copay and coinsurance, no deductible, with OOP Max
- Coinsurance after deductible, no OOP Max
    - Situation 1 (hit deductible)
        - Additional coverage details: You’ve already hit your deductible, so you’ll just pay your estimated coinsurance (your share of the session cost).
    - Situation 2 (haven’t hit deductible)
        - Additional coverage details: 
        
        You’ll pay this full session rate until you reach your deductible of `deductible`. You still have `remaining_deductible` left to go. After that, you’ll only pay `coinsurance` % of each session cost.
        
        Need a lower rate? Talk to your therapist during the first session and we’ll find a session rate that works for you.
- Copay and coinsurance after deductible, with OOP Max
    - Situation 1 (hit deductible)
        - Additional coverage details: You’ve already hit your deductible, so you’ll pay your estimated copay and coinsurance (your share of the session cost).
    - Situation 2 (haven’t hit deductible)
        - Additional coverage details: 
        
        You’ll pay this full session rate until you reach your deductible of `deductible`. You still have `remaining_deductible` left to go. After that, you’ll pay your estimated copay and coinsurance. 
        
        Need a lower rate? Talk to your therapist during the first session and we’ll find a session rate that works for you.