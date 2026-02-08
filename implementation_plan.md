# お題モード設定の拡張計画

ロビー設定の「お題モード」が「自動選出」のときに、親プレイヤーがオリジナルのお題を手動入力できるオプションを追加します。

## User Review Required
- 特になし
    > [!NOTE]
    > 「自動選出される2つのお題のした側にオリジナルワードを入力できる」という要望に基づき、AUTOモードの画面内に手動入力フォームを追加します。

## Proposed Changes

### UI Components

#### [MODIFY] [LobbyScreen.tsx](file:///c:/Users/landk/OneDrive/Desktop/game/HentaIto/src/components/screens/LobbyScreen.tsx)
- `GameSettings` インターフェースに `allowOriginalInAuto: boolean` を追加します。
- `settings` state の初期値に `allowOriginalInAuto: false` を追加します。
- 「自動選出」ラジオボタンが選択されている場合に、「オリジナルも入力可能にする（親入力）」のチェックボックスを表示するUIを追加します。

#### [MODIFY] [App.tsx](file:///c:/Users/landk/OneDrive/Desktop/game/HentaIto/src/App.tsx)
- `gameSettings` state の初期値に `allowOriginalInAuto: false` を追加します。
- `ThemeSelectionScreen` コンポーネントに `allowOriginalInAuto` プロパティを渡すように変更します。

#### [MODIFY] [ThemeSelectionScreen.tsx](file:///c:/Users/landk/OneDrive/Desktop/game/HentaIto/src/components/screens/ThemeSelectionScreen.tsx)
- `ThemeSelectionScreenProps` に `allowOriginalInAuto: boolean` を追加します。
- `gameMode === 'AUTO'` のレンダリング部分において、`allowOriginalInAuto` が `true` の場合、候補リストの下に「オリジナルのお題を入力する」セクションを追加します。
- このセクションでは、`ORIGINAL` モードと同様の入力フォーム（お題、最小値、最大値）を提供し、入力されたお題で決定できるようにします。

## Verification Plan

### Manual Verification
1.  **設定の確認**:
    -   ロビー画面に入り、「お題モード」の「自動選出」を選択した状態で、「オリジナルも入力可能にする」チェックボックスが表示されることを確認する。
    -   チェックボックスをONにして設定を変更する。

2.  **ゲーム開始後の動作確認**:
    -   （デバッグモードでNPCを追加するなどして）ゲームを開始する。
    -   親プレイヤーとしてテーマ選択画面が表示された際、自動選出された2つの候補が表示されていることを確認する。
    -   その下に、オリジナルお題の入力フォームが表示されていることを確認する。
    -   オリジナルお題を入力し、「決定」ボタンを押してゲームが進行することを確認する。

3.  **無効時の動作確認**:
    -   ロビー設定で「オリジナルも入力可能にする」をOFFにしてゲームを開始し、入力フォームが表示されないことを確認する。
