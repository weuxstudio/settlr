# Settlr UI acceptance matrix

Version: 0.2.0

This matrix records the states that must remain visually and functionally
reviewable during the redesign. The application keeps the interface in English.

| ID        | Surface                       | Reproducible state                                       | Expected result                                                                                      |
| --------- | ----------------------------- | -------------------------------------------------------- | ---------------------------------------------------------------------------------------------------- |
| AUTH-01   | `/app`                        | No session, no wallet provider                           | Wallet sign in entry is shown without private data.                                                  |
| AUTH-02   | `/app`                        | Session check in progress                                | The entry shows explanatory loading text. Dashboard content does not flash.                          |
| AUTH-03   | `/app`                        | Wallet connection, network switch or signature requested | The step indicator and action text identify the current wallet action.                               |
| AUTH-04   | `/app`                        | Signature rejected or session service unavailable        | Error text remains actionable and retry is available.                                                |
| AUTH-05   | `/app`                        | Account or chain changes                                 | Private workspace data is cleared and a new sign in is required.                                     |
| DASH-01   | `/app`                        | Authenticated wallet with requests                       | Summary, request table and activity use the shared surface language.                                 |
| DASH-02   | `/app`                        | Authenticated wallet without requests                    | Empty state explains the next action and opens request creation.                                     |
| DASH-03   | `/app`                        | Search or status filter returns no rows                  | The table stays usable and explains how to broaden the query.                                        |
| DASH-04   | `/app`                        | Request API fails                                        | Existing data remains visible when possible and a retry action is shown.                             |
| DASH-05   | `/app`                        | Wallet menu open                                         | Explorer, account switch and disconnect actions are visible and keyboard reachable.                  |
| REQ-01    | `/app`                        | Create dialog opened                                     | Background scroll is locked, focus enters the first relevant field and the footer remains reachable. |
| REQ-02    | `/app`                        | Optional details collapsed or expanded                   | Internal fields remain distinct from payer facing fields.                                            |
| REQ-03    | `/app`                        | Invalid amount, date or required text                    | Field error is shown beside the field and no request is sent.                                        |
| REQ-04    | `/app`                        | Request creation pending or rejected                     | Button state and server error explain whether a retry is possible.                                   |
| REQ-05    | `/app`                        | Details drawer open                                      | Status and amounts lead, technical values wrap, and the drawer traps focus.                          |
| PAY-01    | `/pay/[token]`                | Public request loading or invalid                        | Loading has text; invalid links show a recoverable error.                                            |
| PAY-02    | `/pay/[token]`                | Open request without wallet                              | Amount, requester, purpose and recipient context are visible before connection.                      |
| PAY-03    | `/pay/[token]`                | Wallet check, wrong network or low balance               | The action identifies the required correction and prevents a transaction.                            |
| PAY-04    | `/pay/[token]`                | Transaction submitted                                    | The hash is retained and verification continues after reload.                                        |
| PAY-05    | `/pay/[token]`                | Pending, delayed, rejected or verified receipt           | Each state has distinct text, status color and next action.                                          |
| PAY-06    | `/pay/[token]`                | Closed unpaid or partially paid request                  | Payment controls are absent. The page does not claim settlement.                                     |
| PAY-07    | `/pay/[token]`                | Fully paid or overpaid request                           | Settlement status and the verified receipt action are visible.                                       |
| REC-01    | `/receipt/[token]`            | Loading, missing or service failure                      | Loading has text and failed fetches terminate in an error state.                                     |
| REC-02    | `/receipt/[token]`            | Open, partial, paid or overpaid request                  | Requested, received and remaining or excess amounts are shown in USDC.                               |
| REC-03    | `/receipt/[token]`            | Long hash, address or print view                         | Technical values wrap inside their column and print controls disappear.                              |
| DOC-01    | `/docs`                       | Desktop or mobile                                        | Section navigation remains discoverable, with an expandable mobile table of contents.                |
| DOC-02    | `/docs`                       | Code copy success or failure                             | Success is announced only after the clipboard operation succeeds.                                    |
| GLOBAL-01 | Unknown route or render error | Error page                                               | The message, status code, back action and home action are visible.                                   |

The matrix is reviewed at 360, 768 and 1440 pixels. Automated checks cover
type safety, unit logic, production builds and the existing wallet and API test
suites. Browser checks should use controlled wallet and API responses in the
test environment.
