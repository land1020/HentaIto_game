# Walkthrough - Allow Original Input in Auto Mode

I have implemented the requested feature to allow manual theme input even when "Auto Select" mode is enabled in the lobby settings.

## Changes

### 1. Lobby Settings Update
Added a new checkbox option "オリジナルも入力可能にする (親入力)" under the "Auto Select" mode in the Lobby screen.

### 2. Game Logic Update
Updated the game logic to pass this new setting (`allowOriginalInAuto`) to the Theme Selection screen.

### 3. Theme Selection Screen Update
Modified the Theme Selection screen to display the manual input form (similar to "Original Mode") below the auto-selected candidates when the new setting is enabled.

## Verification Results

### Automated Build Check
- Ran `npm run build` and confirmed it completed successfully without errors.

### Manual Verification Steps
To verify the feature:
1.  Enter the Lobby.
2.  Select "Auto Select" (自動選出) mode.
3.  Check the "オリジナルも入力可能にする (親入力)" box.
4.  Start the game (you can use Debug mode to add NPCs).
5.  As the host/turn player, verify that the Theme Selection screen shows both:
    -   Two auto-selected theme candidates.
    -   An input form below for a custom theme.
6.  Verify that you can select either a candidate or input a custom theme to proceed.
