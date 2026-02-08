# Walkthrough - Score Calculation Update

I have updated the score calculation and display logic for the Result Screen as requested.

## Changes

### 1. Score Calculation Logic (`App.tsx`)
The `calculateTotalScore` function has been revised to follow this sequence:
1.  **Calculate Base Score**: (Incoming guesses - Outgoing guesses)
2.  **Calculate Special Awards**: (True Understander, Perfect Match, etc.)
3.  **Determine Rank**: Sort players based on **(Base Score + Special Award Bonuses)**.
4.  **Apply Rank Bonus**: Add bonuses (1st: +100, 2nd: +50, 3rd: +30) based on the determined rank.
5.  **Finalize Score**: The final round score displayed is the sum of all the above.

### 2. Result Display (`RankingList.tsx`)
-   **Score Display**: Now shows the "Final Round Score" calculated above, which includes all bonuses.
-   **Cumulative Score**: The cumulative score display has been removed to keep the final result unpredictable.

## Verification Results

### Automated Build Check
-   Ran `npm run build` and confirmed it completed successfully.

### Manual Verification Steps
To verify the changes:
1.  Play a round of the game.
2.  On the Result Screen, check the ranking.
    -   Verify that the ranking order seems correct based on performance and special awards.
    -   Check if the displayed score includes the rank bonus (e.g., if a player is 1st, their score should include +100).
    -   Verify that the "Cumulative Score" (累計) is NOT displayed on the player cards.
