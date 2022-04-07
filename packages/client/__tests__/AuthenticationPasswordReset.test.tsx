import { assign, createMachine, EventFrom } from 'xstate';
import { createModel as createTestModel } from '@xstate/test';
import cases from 'jest-in-case';
import Toast from 'react-native-toast-message';
import { rest } from 'msw';
import {
    passwordStrengthRegex,
    RequestPasswordResetRequestBody,
    RequestPasswordResetResponseBody,
    ResetPasswordRequestBody,
    ResetPasswordResponseBody,
    ValidatePasswordResetTokenRequestBody,
    ValidatePasswordResetTokenResponseBody,
} from '@musicroom/types';
import { assertEventType } from '../machines/utils';
import {
    render,
    renderUnauthenticatedApp,
    waitFor,
    fireEvent,
    within,
    generateWeakPassword,
    generateStrongPassword,
    TEST_STRONG_PASSWORD,
} from '../tests/tests-utils';
import { server } from '../tests/server/test-server';
import { SERVER_ENDPOINT } from '../constants/Endpoints';
import { db, generateAuthenticationUser } from '../tests/data';

interface TestingContext {
    screen: ReturnType<typeof render>;
}

/**
 * We need to use different codes to make the context change
 * when providing a code several times, so that `@xstate/test`
 * can return to a state node.
 */
const VALID_PASSWORD_RESET_CODE_LIST = ['123456', '654321'];
const CURRENT_PASSWORD = 'MusicRoom is awesome!';

const passwordResetMachine =
    /** @xstate-layout N4IgpgJg5mDOIC5QAUCGtYHcD2AnCABLnGAC4B0ASmAHYRi4CWNUBsjUNzrzbAxsVoBiACoBPAA5gCYALapGAG0SgJ2dqUbYaKkAA9EAdgBsAJnKmAzAFYADLYAsATksOz1hwBoQYo2fIAHNaWpqbOxgCMprZOpgC+cd5oGDj4RCQU1HQM3GwcXCwEvLACYMLUAI4ArnCkBBLoWHiExLBkumoaWjpI+ogAtJZOEeQx1hHGkQ62lgGmE96+CAET5CZhpoZzJgEBhglJjaktGVS09EyF7Jy5xaXCALKoANbSuKik0oqMsox1xKg+AALSAddR-bq6AwIabWcjjWKGEIRWa2axOayLRAREyWciTezGJwxCLjUIHEDJJppVpkM7ZS6sa4FHg0fiCGhCJ6vAhVGjPGjYTBshi4PAEbB8PhVXBgrraKGIByrJEBByo4kYwy2YxYhATEz4gLGVwRCaI4wUqnHdJtTLnHKFBopZq2sgEPjYejssqcgDKVQARr86s7qSc7QRSNhXmyAGZ4WRyiEK3rQiK2cwrJzGNEOUIBTOGLw+RDzfzo6b5nMOPb7RKUo6u2n2hm5MM2lser3SEoc0SSaTaepNmkZbveuOMMCKCDJzSp0DQ-MOQLWAKWQzWQyhLcm3Wl-VBAL4yyzMzH6xX+IN63N05ZC7t0cR92e71931cl7SPkCoUirgYq4BKUoygQEAys+LpjpG77SAAbqg3wQB8kK9J0KY9EuZY6qMEQONuVhbDsG56qYV54rYBEREEIS2BuN6HDBr6tk+Tovm6dTwT6wgAOLYAQgaAs8UaCRIxAIVoVSwLx2EgJhC7ydC-RmnioSmMYcwrNqtiGBieoTOip45oYWzjNYJpWpxLb0uxrAdvekZTjQyFyUIAbBn8I4sVxBAuW5Ca4EmGHgkpipHuM5A4pmswEXMEROAE5HxeQIS5sYhG5uuTj1sx4ZcXZjoOTZ44BYo7niFIEpsjQYCYD5BVTjOc6hfKyllmEq4eDuCK0VYBmHkZxjkIRrj2NpbjWb5tmPsVjWdmVzBuZ+jw-gtTnusQ1S1P5CjKG1WERaSWlpS4mwrJYxjWFYyVDSatjRRmtbKgxphOOq00FbNDqMhtsHuuV7nctIno0FOwVocOPFgHoEiMMQrWqGF6E4QgFEeGlDjmZsxJzE4hlIquV0WUEmZquuX2LXaRV-Y5AN1EDq2cgJQkiWJ9SSdJsnM-OqN9PqenmOu10fa412ZiWSyhI4oxmVEhHKtqmwJA2gr0PAvR3gztO5Mytxssz5AAJIQIoYB84uAv9M4q7TCayo3VesJ6kSTjkLEjhaTYczvQEVObWx8364UdwcuQAAijCwBIiioGIuQAsCkBEB8Xw-N50boKQlsdejN0e8qxg7vmew6ndSwZvYawxDEOYzI45K3qVNNzX9IesnJkfR7H8cG0hKEyPIShidnucRZsj3zFY706pplgLIeLgjBuxofduV0kwHOtt3r+QG13Ucx3HCeFH+grCjIQHilnsA54d4VpmW-gbpENhuNRVhS9iel4tMyvUQItRPY29WK6yuPvUOht7g0G7sfPuhQ5D7SKLJOQEhSBiAIMhBg99kbtQntdNKllro4jVHWTEh5jR4g8IrWYN1dh5UbDNB8v0943CgYfHuJ9oLfXHMwAejBCA8VvrghSKMrbQnmIYD2ZkN5EwcLCQwhkCJwhsJYTMZpGLjFAYVXeED2Gd15g-fmKlxgnntqaJ2Hg0SuwIh7CiDdIguHFjon6bYOLMLgj2Th8DT4lU8e6WAVQpRwFgHGKoFVto1DvqPO+48n76lmGsNRO4dTKnnuRGI1CkqTEytMKhriWHuP8bwrxH4YEmxoAIwgQVZDkAAMLeOjkPdBSw8FHQSZlE8uk9KxGxrsMI5FNLuw8EMCiZDhjWEKa3VhHjSlvm8UbY2VTkKCP8omBpTTZL8NWUjMR+CElIjxIlVwO4rBXTVORM8J5gguFijuWILhpl0j0SU6mCzynh2WdU9ZwVyAAFV+QX0AsBUC0pEYQSgoUapUN5KKRMYgTKeIen6TCFsOY390b-3hKc2sQxcpameUHOmLcPm9gqd83ZvyQrtMfmjJxNd7Cov6RilKOZ4S1ksiuJEjgiXgLeYHCc5Lw4iBjLQAgMLPh7PhRIss254TGmulYOwHg0WZLCPiGYMtlT4uLny15-1WJCrkvEtGWxAiJWyvmUwhZNiYpOe7XMZlYq9K0paZuATiU8PeYzZaFUllmwtsY2V+ptQnliGeW6DF9KL0rhid2OYiR6RNFEXK-sPXzK9XMn1-k-U+N7n4w1floyxglbstO0rxF5wIoQ+wN1DAGmGBiUwKVlSBGiBMfMelOVTIzT6-lRauxMwpSswetTyAADl6pFuaWgjBpqBaaWcB7ew8w9jvRupsFKL8JhqOcEiLl+rZkCoZrm1y-qR0-PHVOhq9NCDNNgKgWQ0h0AehlMQGgdRtBBtpQi9GmURoLx1MEM02MbqWCuQxNYOUskom3DMI9xTB1LXPV3SlY6NmAv-JfUU4pJTgpTpBP6UTagLskZlR6iatLGgohuiDh5iLSK3PmRKThERbAcIh+yyHnJ5qWaOtZ17p13pQQQQUdQ75ikQYKKoUAgRkefgotY+lm3RE9gTBjYRHpDFuUSbMEQuPzRE0Ovjl6qW1IU-+1YVHdjuDo5kgI7s5h11olqQihmSWerPStGBlmCJtrrZsRtiUbqGT2KuXKpIP7vTde6-K-aDVAmwM+k1wa87DBuVERzbGHFXUxTa9lxcFG7vVGYxh2tWKWf6Kq0aOpLEYxdoeDwIxHnohtYWdUOZVZxCAA */
    createMachine(
        {
            context: {
                email: 'devessier@devessier.fr',
                hasReachedRateLimit: false,
                hasUnknownErrorOccured: false,
                passwordResetCode: undefined,
                isPasswordResetCodeExpired: false,
                hasUnknownErrorOccuredDuringPasswordResetCodeValidation: false,
                newPassword: '',
                hasUnknownErrorOccuredDuringPasswordReset: false,
                wentBackTimes: 0,
            },
            schema: {
                context: {} as {
                    email: string;
                    hasReachedRateLimit: boolean;
                    hasUnknownErrorOccured: boolean;
                    passwordResetCode: string | undefined;
                    isPasswordResetCodeExpired: boolean;
                    hasUnknownErrorOccuredDuringPasswordResetCodeValidation: boolean;
                    newPassword: string;
                    hasUnknownErrorOccuredDuringPasswordReset: boolean;
                    wentBackTimes: number;
                },
                events: {} as
                    | {
                          type: 'Type email';
                          email: string;
                      }
                    | {
                          type: 'Request password reset';
                      }
                    | {
                          type: 'Make rate limit reached';
                      }
                    | {
                          type: 'Make unknown error occur';
                      }
                    | {
                          type: 'Type on password reset code field';
                          code: string;
                      }
                    | {
                          type: 'Make unknown error occur during password reset code validation';
                      }
                    | {
                          type: 'Submit password reset token form';
                      }
                    | {
                          type: 'Submit password reset final form';
                      }
                    | {
                          type: 'Make confirmation code expired';
                      }
                    | {
                          type: 'Type on new password field';
                          newPassword: string;
                      }
                    | {
                          type: 'Make password reset request fail';
                      }
                    | {
                          type: 'Go back to previous screen';
                      },
            },
            initial: 'Rendering signing in screen',
            states: {
                'Rendering signing in screen': {
                    initial: 'Idle',
                    states: {
                        Idle: {},
                        'Displaying reached rate limit toast': {
                            meta: {
                                test: async () => {
                                    await waitFor(() => {
                                        expect(Toast.show).toHaveBeenCalledWith(
                                            {
                                                type: 'error',
                                                text1: expect.any(String),
                                                text2: expect.any(String),
                                            },
                                        );
                                    });
                                },
                            },
                        },
                        'Displaying invalid email toast': {
                            meta: {
                                test: async () => {
                                    await waitFor(() => {
                                        expect(Toast.show).toHaveBeenCalledWith(
                                            {
                                                type: 'error',
                                                text1: expect.any(String),
                                                text2: expect.any(String),
                                            },
                                        );
                                    });
                                },
                            },
                        },
                        'Displaying unknown error toast': {
                            meta: {
                                test: async () => {
                                    await waitFor(() => {
                                        expect(Toast.show).toHaveBeenCalledWith(
                                            {
                                                type: 'error',
                                                text1: expect.any(String),
                                                text2: expect.any(String),
                                            },
                                        );
                                    });
                                },
                            },
                        },
                        'Displaying email is empty alert': {
                            meta: {
                                test: async ({ screen }: TestingContext) => {
                                    await waitFor(() => {
                                        const signingInEmailField =
                                            screen.getByTestId(
                                                'signing-in-screen-email-field',
                                            );
                                        expect(
                                            signingInEmailField,
                                        ).toBeTruthy();

                                        const alert =
                                            within(
                                                signingInEmailField,
                                            ).getByRole('alert');
                                        expect(alert).toBeTruthy();

                                        expect(alert).toHaveTextContent(
                                            'This field is required',
                                        );
                                    });
                                },
                            },
                        },
                        'Displaying password reset invalid code toast': {
                            meta: {
                                test: async () => {
                                    await waitFor(() => {
                                        expect(Toast.show).toHaveBeenCalledWith(
                                            {
                                                type: 'error',
                                                text1: 'Changing password failed',
                                                text2: expect.stringMatching(
                                                    /confirmation.*code.*expired/i,
                                                ),
                                            },
                                        );
                                    });
                                },
                            },
                        },
                    },
                    on: {
                        'Type email': {
                            actions: 'Assign typed email to context',
                        },
                        'Request password reset': [
                            {
                                cond: 'Is email empty',
                                target: '.Displaying email is empty alert',
                            },
                            {
                                cond: 'Is email invalid',
                                target: '.Displaying invalid email toast',
                            },
                            {
                                cond: 'Has reached rate limit',
                                target: '.Displaying reached rate limit toast',
                            },
                            {
                                cond: 'Has unknown error occured',
                                target: '.Displaying unknown error toast',
                            },
                            {
                                target: '#Password reset.Rendering password reset code screen.Displaying password reset successful request toast',
                            },
                        ],
                        'Make rate limit reached': {
                            actions:
                                'Assign rate limit has been reached to context',
                        },
                        'Make unknown error occur': {
                            actions: 'Assign unknown error occured to context',
                        },
                    },
                },
                'Rendering password reset code screen': {
                    meta: {
                        test: async ({ screen }: TestingContext) => {
                            await waitFor(() => {
                                const passwordResetCodeScreenContainer =
                                    screen.getByTestId(
                                        'password-reset-confirmation-token-screen-container',
                                    );
                                expect(
                                    passwordResetCodeScreenContainer,
                                ).toBeTruthy();
                            });
                        },
                    },
                    initial:
                        'Displaying password reset successful request toast',
                    states: {
                        /**
                         * When the user requests a password reset, we display a success toast
                         * and we redirect her to "password reset code screen".
                         *
                         * In the state bellow we check that the toast has been displayed,
                         * and in its parent (meta.test above), we check that we are on password reset code screen.
                         */
                        'Displaying password reset successful request toast': {
                            meta: {
                                test: async () => {
                                    await waitFor(() => {
                                        expect(Toast.show).toHaveBeenCalledWith(
                                            {
                                                type: 'success',
                                                text1: expect.any(String),
                                                text2: expect.any(String),
                                            },
                                        );
                                    });
                                },
                            },
                        },
                        'Invalid form': {
                            initial: 'Code is empty',
                            states: {
                                'Code is empty': {
                                    meta: {
                                        test: async ({
                                            screen,
                                        }: TestingContext) => {
                                            await waitFor(() => {
                                                const passwordResetConfirmationCodeField =
                                                    screen.getByTestId(
                                                        'password-reset-confirmation-code-field',
                                                    );
                                                expect(
                                                    passwordResetConfirmationCodeField,
                                                ).toBeTruthy();

                                                const alert = within(
                                                    passwordResetConfirmationCodeField,
                                                ).getByRole('alert');
                                                expect(alert).toBeTruthy();

                                                expect(alert).toHaveTextContent(
                                                    'This field is required',
                                                );
                                            });
                                        },
                                    },
                                },
                                'Code is invalid': {
                                    meta: {
                                        test: async ({
                                            screen,
                                        }: TestingContext) => {
                                            await waitFor(() => {
                                                const passwordResetConfirmationCodeField =
                                                    screen.getByTestId(
                                                        'password-reset-confirmation-code-field',
                                                    );
                                                expect(
                                                    passwordResetConfirmationCodeField,
                                                ).toBeTruthy();

                                                const alert = within(
                                                    passwordResetConfirmationCodeField,
                                                ).getByRole('alert');
                                                expect(alert).toBeTruthy();

                                                expect(alert).toHaveTextContent(
                                                    'Code is invalid.',
                                                );
                                            });
                                        },
                                    },
                                },
                                'Unknown error occured during validation': {
                                    meta: {
                                        test: async () => {
                                            await waitFor(() => {
                                                expect(
                                                    Toast.show,
                                                ).toHaveBeenCalledWith({
                                                    type: 'error',
                                                    text1: 'Validation of the code failed',
                                                    text2: expect.any(String),
                                                });
                                            });
                                        },
                                    },
                                },
                            },
                        },
                        'Token validated': {
                            type: 'final',
                        },
                    },
                    on: {
                        'Submit password reset token form': [
                            {
                                cond: 'Is code empty',
                                target: '.Invalid form.Code is empty',
                            },
                            {
                                cond: 'Is code invalid',
                                target: '.Invalid form.Code is invalid',
                            },
                            {
                                cond: 'Has unknown error occured during token validation',
                                target: '.Invalid form.Unknown error occured during validation',
                            },
                            {
                                target: '#Password reset.Rendering password reset final screen.Displaying password reset token validated',
                            },
                        ],
                        'Type on password reset code field': {
                            actions: 'Assign password reset code to context',
                        },
                        'Make unknown error occur during password reset code validation':
                            {
                                actions:
                                    'Assign unknown error occured during password reset code validation to context',
                            },
                        'Go back to previous screen': {
                            actions: 'Increment went back times in context',
                            cond: 'Has not reached going back limit',
                            target: 'Rendering signing in screen',
                        },
                    },
                },
                'Rendering password reset final screen': {
                    meta: {
                        test: async ({ screen }: TestingContext) => {
                            await waitFor(() => {
                                const passwordResetNewPasswordScreenContainer =
                                    screen.getByTestId(
                                        'password-reset-new-password-screen-container',
                                    );
                                expect(
                                    passwordResetNewPasswordScreenContainer,
                                ).toBeTruthy();
                            });
                        },
                    },
                    initial: 'Idle',
                    states: {
                        Idle: {},
                        'Displaying password reset token validated': {
                            meta: {
                                test: async () => {
                                    await waitFor(() => {
                                        expect(Toast.show).toHaveBeenCalledWith(
                                            {
                                                type: 'success',
                                                text1: 'Confirmed validity of the code',
                                            },
                                        );
                                    });
                                },
                            },
                        },
                        'Invalid form': {
                            initial: 'New password is empty',
                            states: {
                                'New password is empty': {
                                    meta: {
                                        test: async ({
                                            screen,
                                        }: TestingContext) => {
                                            await waitFor(() => {
                                                const passwordResetNewPasswordField =
                                                    screen.getByTestId(
                                                        'password-reset-new-password-field',
                                                    );
                                                expect(
                                                    passwordResetNewPasswordField,
                                                ).toBeTruthy();

                                                const alert = within(
                                                    passwordResetNewPasswordField,
                                                ).getByRole('alert');
                                                expect(alert).toBeTruthy();

                                                expect(alert).toHaveTextContent(
                                                    'This field is required',
                                                );
                                            });
                                        },
                                    },
                                },
                                'New password is same as current one': {
                                    meta: {
                                        test: async ({
                                            screen,
                                        }: TestingContext) => {
                                            await waitFor(() => {
                                                const passwordResetNewPasswordField =
                                                    screen.getByTestId(
                                                        'password-reset-new-password-field',
                                                    );
                                                expect(
                                                    passwordResetNewPasswordField,
                                                ).toBeTruthy();

                                                const alert = within(
                                                    passwordResetNewPasswordField,
                                                ).getByRole('alert');
                                                expect(alert).toBeTruthy();

                                                expect(alert).toHaveTextContent(
                                                    'New password must be different than old password.',
                                                );
                                            });
                                        },
                                    },
                                },
                                'Unknown error occured during request': {
                                    meta: {
                                        test: async () => {
                                            await waitFor(() => {
                                                expect(
                                                    Toast.show,
                                                ).toHaveBeenCalledWith({
                                                    type: 'error',
                                                    text1: 'Changing password failed',
                                                    text2: expect.stringMatching(
                                                        /unknown.*error.*try.*again/i,
                                                    ),
                                                });
                                            });
                                        },
                                    },
                                },
                                'New password is not strong enough': {
                                    meta: {
                                        test: async ({
                                            screen,
                                        }: TestingContext) => {
                                            await waitFor(() => {
                                                const passwordResetNewPasswordField =
                                                    screen.getByTestId(
                                                        'password-reset-new-password-field',
                                                    );
                                                expect(
                                                    passwordResetNewPasswordField,
                                                ).toBeTruthy();

                                                const alert = within(
                                                    passwordResetNewPasswordField,
                                                ).getByRole('alert');
                                                expect(alert).toBeTruthy();

                                                expect(alert).toHaveTextContent(
                                                    'Password is too weak',
                                                );
                                            });
                                        },
                                    },
                                },
                            },
                        },
                    },
                    on: {
                        'Submit password reset final form': [
                            {
                                cond: 'Is new password empty',
                                target: '.Invalid form.New password is empty',
                            },
                            {
                                cond: 'Is new password not strong enough',
                                target: '.Invalid form.New password is not strong enough',
                            },
                            {
                                cond: 'Is new password same as current one',
                                target: '.Invalid form.New password is same as current one',
                            },
                            {
                                cond: 'Has unknown error occured during password reset request',
                                target: '.Invalid form.Unknown error occured during request',
                            },
                            {
                                cond: 'Is code invalid',
                                target: '#Password reset.Rendering signing in screen.Displaying password reset invalid code toast',
                            },
                            {
                                target: 'Rendering home screen',
                            },
                        ],
                        'Type on new password field': {
                            actions: 'Assign new password to context',
                        },
                        'Make password reset request fail': {
                            actions:
                                'Assign unknown error occured during password reset request to context',
                        },
                        'Make confirmation code expired': {
                            actions:
                                'Assign password reset code has expired to context',
                        },
                        'Go back to previous screen': {
                            actions: 'Increment went back times in context',
                            cond: 'Has not reached going back limit',
                            target: 'Rendering password reset code screen',
                        },
                    },
                },
                'Rendering home screen': {
                    type: 'final',
                    meta: {
                        test: async ({ screen }: TestingContext) => {
                            await Promise.all([
                                waitFor(() => {
                                    expect(Toast.show).toHaveBeenCalledWith({
                                        type: 'success',
                                        text1: 'Password changed successfully',
                                    });
                                }),

                                waitFor(() => {
                                    expect(
                                        screen.getAllByText(/home/i).length,
                                    ).toBeGreaterThanOrEqual(1);
                                }),
                            ]);
                        },
                    },
                },
            },
            id: 'Password reset',
        },
        {
            guards: {
                'Has reached rate limit': (context) =>
                    context.hasReachedRateLimit === true,

                'Is email invalid': (context) =>
                    context.email !== existingUser.email,

                'Has unknown error occured': (context) =>
                    context.hasUnknownErrorOccured === true,

                'Is email empty': (context) => context.email.length === 0,

                'Is code empty': (context) => context.passwordResetCode === '',

                'Is code invalid': ({
                    isPasswordResetCodeExpired,
                    passwordResetCode,
                }) => {
                    if (isPasswordResetCodeExpired === true) {
                        return true;
                    }

                    if (passwordResetCode === undefined) {
                        return true;
                    }

                    return (
                        VALID_PASSWORD_RESET_CODE_LIST.includes(
                            passwordResetCode,
                        ) === false
                    );
                },

                'Has unknown error occured during token validation': (
                    context,
                ) =>
                    context.hasUnknownErrorOccuredDuringPasswordResetCodeValidation ===
                    true,

                'Is new password empty': ({ newPassword }) =>
                    newPassword === '',

                'Is new password not strong enough': ({ newPassword }) => {
                    return !passwordStrengthRegex.test(newPassword);
                },

                'Is new password same as current one': ({ newPassword }) =>
                    newPassword === CURRENT_PASSWORD,

                'Has unknown error occured during password reset request': ({
                    hasUnknownErrorOccuredDuringPasswordReset,
                }) => hasUnknownErrorOccuredDuringPasswordReset === true,

                /**
                 * To prevent infinite loop during path creation, we need to limit how
                 * many times we authorize the user to go back to the previous screen.
                 */
                'Has not reached going back limit': ({ wentBackTimes }) =>
                    wentBackTimes < 2,
            },
            actions: {
                'Assign typed email to context': assign({
                    email: (_context, event) => {
                        assertEventType(event, 'Type email');

                        return event.email;
                    },
                }),

                'Assign rate limit has been reached to context': assign({
                    hasReachedRateLimit: (_context) => true,
                }),

                'Assign unknown error occured to context': assign({
                    hasUnknownErrorOccured: (_context) => true,
                }),

                'Assign password reset code to context': assign({
                    passwordResetCode: (_context, event) => {
                        assertEventType(
                            event,
                            'Type on password reset code field',
                        );

                        return event.code;
                    },
                }),

                'Assign unknown error occured during password reset code validation to context':
                    assign({
                        hasUnknownErrorOccuredDuringPasswordResetCodeValidation:
                            (_context) => true,
                    }),

                'Assign password reset code has expired to context': assign({
                    isPasswordResetCodeExpired: (_context) => true,
                }),

                'Assign new password to context': assign({
                    newPassword: (_context, event) => {
                        assertEventType(event, 'Type on new password field');

                        return event.newPassword;
                    },
                }),

                'Assign unknown error occured during password reset request to context':
                    assign({
                        hasUnknownErrorOccuredDuringPasswordReset: (_context) =>
                            true,
                    }),

                'Increment went back times in context': assign({
                    wentBackTimes: (context) => context.wentBackTimes + 1,
                }),
            },
        },
    );

const resetPasswordTestModel = createTestModel<TestingContext>(
    passwordResetMachine,
).withEvents({
    'Type email': async ({ screen }, e) => {
        const event = e as EventFrom<typeof passwordResetMachine, 'Type email'>;

        const emailField = await screen.findByPlaceholderText(/email/i);
        expect(emailField).toBeTruthy();

        fireEvent.changeText(emailField, event.email);
    },

    'Request password reset': async ({ screen }) => {
        const requestPasswordResetButton = await screen.findByText(
            /do.*you.*lost.*password/i,
        );
        expect(requestPasswordResetButton).toBeTruthy();

        fireEvent.press(requestPasswordResetButton);
    },

    'Make rate limit reached': () => {
        server.use(
            rest.post<
                RequestPasswordResetRequestBody,
                never,
                RequestPasswordResetResponseBody
            >(
                `${SERVER_ENDPOINT}/authentication/request-password-reset`,
                (_req, res, ctx) => {
                    return res(
                        ctx.status(429),
                        ctx.json({
                            status: 'REACHED_RATE_LIMIT',
                        }),
                    );
                },
            ),
        );
    },

    'Make unknown error occur': () => {
        server.use(
            rest.post<
                RequestPasswordResetRequestBody,
                never,
                RequestPasswordResetResponseBody
            >(
                `${SERVER_ENDPOINT}/authentication/request-password-reset`,
                (_req, res, ctx) => {
                    return res(ctx.status(500));
                },
            ),
        );
    },

    'Type on password reset code field': async ({ screen }, e) => {
        const event = e as EventFrom<
            typeof passwordResetMachine,
            'Type on password reset code field'
        >;

        const passwordResetConfirmationCodeField = await screen.findByTestId(
            'password-reset-confirmation-code-field',
        );
        expect(passwordResetConfirmationCodeField).toBeTruthy();

        const passwordResetCodeTextField = within(
            passwordResetConfirmationCodeField,
        ).getByPlaceholderText(/enter.*confirmation.*code/i);
        expect(passwordResetCodeTextField).toBeTruthy();

        fireEvent.changeText(passwordResetCodeTextField, event.code);
    },

    'Submit password reset token form': async ({ screen }) => {
        const passwordResetCodeScreenContainer = await screen.findByTestId(
            'password-reset-confirmation-token-screen-container',
        );
        expect(passwordResetCodeScreenContainer).toBeTruthy();

        const submitPasswordResetCodeFormButton = within(
            passwordResetCodeScreenContainer,
        ).getByText(/submit/i);
        expect(submitPasswordResetCodeFormButton).toBeTruthy();

        fireEvent.press(submitPasswordResetCodeFormButton);
    },

    'Make unknown error occur during password reset code validation': () => {
        server.use(
            rest.post<
                ValidatePasswordResetTokenRequestBody,
                never,
                ValidatePasswordResetTokenResponseBody
            >(
                `${SERVER_ENDPOINT}/authentication/validate-password-reset-token`,
                (_req, res, ctx) => {
                    return res(ctx.status(500));
                },
            ),
        );
    },

    'Submit password reset final form': async ({ screen }) => {
        const passwordResetNewPasswordScreenContainer =
            await screen.findByTestId(
                'password-reset-new-password-screen-container',
            );
        expect(passwordResetNewPasswordScreenContainer).toBeTruthy();

        const submitPasswordResetNewPasswordFormButton = within(
            passwordResetNewPasswordScreenContainer,
        ).getByText(/^submit$/i);
        expect(submitPasswordResetNewPasswordFormButton).toBeTruthy();

        fireEvent.press(submitPasswordResetNewPasswordFormButton);
    },

    'Type on new password field': async ({ screen }, e) => {
        const event = e as EventFrom<
            typeof passwordResetMachine,
            'Type on new password field'
        >;

        const passwordResetNewPasswordScreenContainer =
            await screen.findByTestId(
                'password-reset-new-password-screen-container',
            );
        expect(passwordResetNewPasswordScreenContainer).toBeTruthy();

        const newPasswordField = await within(
            passwordResetNewPasswordScreenContainer,
        ).findByPlaceholderText(/new.*password/i);
        expect(newPasswordField).toBeTruthy();

        fireEvent.changeText(newPasswordField, event.newPassword);
    },

    'Make password reset request fail': () => {
        server.use(
            rest.post<
                ResetPasswordRequestBody,
                never,
                ResetPasswordResponseBody
            >(
                `${SERVER_ENDPOINT}/authentication/reset-password`,
                (_req, res, ctx) => {
                    return res(ctx.status(500));
                },
            ),
        );
    },

    'Make confirmation code expired': () => {
        server.use(
            rest.post<
                ResetPasswordRequestBody,
                never,
                ResetPasswordResponseBody
            >(
                `${SERVER_ENDPOINT}/authentication/reset-password`,
                (_req, res, ctx) => {
                    return res(
                        ctx.status(400),
                        ctx.json({
                            status: 'INVALID_TOKEN',
                        }),
                    );
                },
            ),
        );
    },

    'Go back to previous screen': async ({ screen }) => {
        const goBackButtons = await screen.findAllByLabelText(/go.*back/i);
        const lastGoBackButton = goBackButtons[goBackButtons.length - 1];

        fireEvent.press(lastGoBackButton);
    },
});

const existingUser = generateAuthenticationUser();

cases<{
    target:
        | {
              'Rendering signing in screen':
                  | 'Displaying reached rate limit toast'
                  | 'Displaying invalid email toast'
                  | 'Displaying unknown error toast'
                  | 'Displaying email is empty alert';
          }
        | {
              'Rendering password reset code screen': 'Displaying password reset successful request toast';
          };
    events: EventFrom<typeof passwordResetMachine>[];
}>(
    'Request password reset',
    async ({ target, events }) => {
        db.authenticationUser.create(existingUser);
        db.myProfileInformation.create({
            userID: existingUser.uuid,
            devicesCounter: 3,
            playlistsCounter: 4,
            followersCounter: 5,
            followingCounter: 6,
            userNickname: existingUser.nickname,
            hasConfirmedEmail: true,
        });

        const screen = await renderUnauthenticatedApp();

        const plan = resetPasswordTestModel.getPlanFromEvents(events, {
            target,
        });

        await plan.test({ screen });
    },
    {
        'Shows success toast when password reset succeeded': {
            target: {
                'Rendering password reset code screen':
                    'Displaying password reset successful request toast',
            },
            events: [
                {
                    type: 'Type email',
                    email: existingUser.email,
                },
                {
                    type: 'Request password reset',
                },
            ],
        },
        'Requires email to be filled to request a password reset': {
            target: {
                'Rendering signing in screen':
                    'Displaying email is empty alert',
            },
            events: [
                {
                    type: 'Type email',
                    email: '',
                },
                {
                    type: 'Request password reset',
                },
            ],
        },
        'Shows error toast when email is invalid': {
            target: {
                'Rendering signing in screen': 'Displaying invalid email toast',
            },
            events: [
                {
                    type: 'Type email',
                    email: 'unknown-email@gmail.com',
                },
                {
                    type: 'Request password reset',
                },
            ],
        },
        'Shows error toast when rate limit is reached': {
            target: {
                'Rendering signing in screen':
                    'Displaying reached rate limit toast',
            },
            events: [
                {
                    type: 'Make rate limit reached',
                },
                {
                    type: 'Type email',
                    email: existingUser.email,
                },
                {
                    type: 'Request password reset',
                },
            ],
        },
        'Shows error toast when an unknown error occured': {
            target: {
                'Rendering signing in screen': 'Displaying unknown error toast',
            },
            events: [
                {
                    type: 'Make unknown error occur',
                },
                {
                    type: 'Type email',
                    email: existingUser.email,
                },
                {
                    type: 'Request password reset',
                },
            ],
        },
        'Users can request a password reset several times': {
            target: {
                'Rendering password reset code screen':
                    'Displaying password reset successful request toast',
            },
            events: [
                {
                    type: 'Type email',
                    email: '',
                },
                {
                    type: 'Request password reset',
                },
                {
                    type: 'Type email',
                    email: existingUser.email,
                },
                {
                    type: 'Request password reset',
                },
            ],
        },
    },
);

cases<{
    target:
        | {
              'Rendering password reset code screen':
                  | 'Displaying password reset successful request toast'
                  | {
                        'Invalid form':
                            | 'Code is empty'
                            | 'Code is invalid'
                            | 'Unknown error occured during validation';
                    };
          }
        | {
              'Rendering password reset final screen': 'Displaying password reset token validated';
          };
    events: EventFrom<typeof passwordResetMachine>[];
}>(
    'Validate password reset token',
    async ({ target, events }) => {
        db.authenticationUser.create(existingUser);
        db.myProfileInformation.create({
            userID: existingUser.uuid,
            devicesCounter: 3,
            playlistsCounter: 4,
            followersCounter: 5,
            followingCounter: 6,
            userNickname: existingUser.nickname,
            hasConfirmedEmail: true,
        });

        const screen = await renderUnauthenticatedApp();

        const plan = resetPasswordTestModel.getPlanFromEvents(events, {
            target,
        });

        await plan.test({ screen });
    },
    {
        'Displays alert when code is empty': {
            target: {
                'Rendering password reset code screen': {
                    'Invalid form': 'Code is empty',
                },
            },
            events: [
                {
                    type: 'Type email',
                    email: existingUser.email,
                },
                {
                    type: 'Request password reset',
                },
                {
                    type: 'Type on password reset code field',
                    code: '',
                },
                {
                    type: 'Submit password reset token form',
                },
            ],
        },

        'Displays alert when code is invalid': {
            target: {
                'Rendering password reset code screen': {
                    'Invalid form': 'Code is invalid',
                },
            },
            events: [
                {
                    type: 'Type email',
                    email: existingUser.email,
                },
                {
                    type: 'Request password reset',
                },
                {
                    type: 'Type on password reset code field',
                    code: '--INVALID TOKEN--',
                },
                {
                    type: 'Submit password reset token form',
                },
            ],
        },

        'Shows error toast when an unknown error occurs during password reset code validation':
            {
                target: {
                    'Rendering password reset code screen': {
                        'Invalid form':
                            'Unknown error occured during validation',
                    },
                },
                events: [
                    {
                        type: 'Type email',
                        email: existingUser.email,
                    },
                    {
                        type: 'Request password reset',
                    },
                    {
                        type: 'Make unknown error occur during password reset code validation',
                    },
                    {
                        type: 'Type on password reset code field',
                        code: VALID_PASSWORD_RESET_CODE_LIST[0],
                    },
                    {
                        type: 'Submit password reset token form',
                    },
                ],
            },

        'Shows success toast when valid password reset code is provided': {
            target: {
                'Rendering password reset final screen':
                    'Displaying password reset token validated',
            },
            events: [
                {
                    type: 'Type email',
                    email: existingUser.email,
                },
                {
                    type: 'Request password reset',
                },
                {
                    type: 'Type on password reset code field',
                    code: VALID_PASSWORD_RESET_CODE_LIST[0],
                },
                {
                    type: 'Submit password reset token form',
                },
            ],
        },
    },
);

cases<{
    target:
        | {
              'Rendering password reset final screen':
                  | 'Displaying password reset token validated'
                  | {
                        'Invalid form':
                            | 'New password is empty'
                            | 'New password is not strong enough'
                            | 'New password is same as current one'
                            | 'Unknown error occured during request';
                    };
          }
        | 'Rendering home screen'
        | {
              'Rendering signing in screen': 'Displaying password reset invalid code toast';
          };
    events: EventFrom<typeof passwordResetMachine>[];
}>(
    'Sets a new password',
    async ({ target, events }) => {
        db.authenticationUser.create(existingUser);
        db.myProfileInformation.create({
            userID: existingUser.uuid,
            devicesCounter: 3,
            playlistsCounter: 4,
            followersCounter: 5,
            followingCounter: 6,
            userNickname: existingUser.nickname,
            hasConfirmedEmail: true,
        });

        const screen = await renderUnauthenticatedApp();

        const plan = resetPasswordTestModel.getPlanFromEvents(events, {
            target,
        });

        await plan.test({ screen });
    },
    {
        'Displays alert when new password is empty': {
            target: {
                'Rendering password reset final screen': {
                    'Invalid form': 'New password is empty',
                },
            },
            events: [
                {
                    type: 'Type email',
                    email: existingUser.email,
                },
                {
                    type: 'Request password reset',
                },
                {
                    type: 'Type on password reset code field',
                    code: '123456',
                },
                {
                    type: 'Submit password reset token form',
                },
                {
                    type: 'Submit password reset final form',
                },
            ],
        },

        'Displays alert when new password is not strong enough': {
            target: {
                'Rendering password reset final screen': {
                    'Invalid form': 'New password is not strong enough',
                },
            },
            events: [
                {
                    type: 'Type email',
                    email: existingUser.email,
                },
                {
                    type: 'Request password reset',
                },
                {
                    type: 'Type on password reset code field',
                    code: '123456',
                },
                {
                    type: 'Submit password reset token form',
                },
                {
                    type: 'Type on new password field',
                    newPassword: generateWeakPassword(),
                },
                {
                    type: 'Submit password reset final form',
                },
            ],
        },

        'Displays alert when new password is same as current one': {
            target: {
                'Rendering password reset final screen': {
                    'Invalid form': 'New password is same as current one',
                },
            },
            events: [
                {
                    type: 'Type email',
                    email: existingUser.email,
                },
                {
                    type: 'Request password reset',
                },
                {
                    type: 'Type on password reset code field',
                    code: '123456',
                },
                {
                    type: 'Submit password reset token form',
                },
                {
                    type: 'Type on new password field',
                    newPassword: CURRENT_PASSWORD,
                },
                {
                    type: 'Submit password reset final form',
                },
            ],
        },

        'Displays error toast when an error occured during request': {
            target: {
                'Rendering password reset final screen': {
                    'Invalid form': 'Unknown error occured during request',
                },
            },
            events: [
                {
                    type: 'Type email',
                    email: existingUser.email,
                },
                {
                    type: 'Request password reset',
                },
                {
                    type: 'Type on password reset code field',
                    code: '123456',
                },
                {
                    type: 'Submit password reset token form',
                },
                {
                    type: 'Make password reset request fail',
                },
                {
                    type: 'Type on new password field',
                    newPassword: generateStrongPassword(),
                },
                {
                    type: 'Submit password reset final form',
                },
            ],
        },

        'Redirects to signing in screen when token has expired': {
            target: {
                'Rendering signing in screen':
                    'Displaying password reset invalid code toast',
            },
            events: [
                {
                    type: 'Type email',
                    email: existingUser.email,
                },
                {
                    type: 'Request password reset',
                },
                {
                    type: 'Type on password reset code field',
                    code: '123456',
                },
                {
                    type: 'Submit password reset token form',
                },
                {
                    type: 'Make confirmation code expired',
                },
                {
                    type: 'Type on new password field',
                    newPassword: generateStrongPassword(),
                },
                {
                    type: 'Submit password reset final form',
                },
            ],
        },

        'Redirects to home screen and authenticates the user when password reset succeeds':
            {
                target: 'Rendering home screen',
                events: [
                    {
                        type: 'Type email',
                        email: existingUser.email,
                    },
                    {
                        type: 'Request password reset',
                    },
                    {
                        type: 'Type on password reset code field',
                        code: '123456',
                    },
                    {
                        type: 'Submit password reset token form',
                    },
                    {
                        type: 'Type on new password field',
                        newPassword: generateStrongPassword(),
                    },
                    {
                        type: 'Submit password reset final form',
                    },
                ],
            },

        'Goes up to new password screen, goes back to signing in screen and then submits again all forms to finally get authenticated':
            {
                target: 'Rendering home screen',
                events: [
                    {
                        type: 'Type email',
                        email: existingUser.email,
                    },
                    {
                        type: 'Request password reset',
                    },
                    {
                        type: 'Type on password reset code field',
                        code: VALID_PASSWORD_RESET_CODE_LIST[0],
                    },
                    {
                        type: 'Submit password reset token form',
                    },
                    {
                        type: 'Type on new password field',
                        newPassword: TEST_STRONG_PASSWORD[0],
                    },
                    {
                        type: 'Go back to previous screen',
                    },
                    {
                        type: 'Go back to previous screen',
                    },
                    {
                        type: 'Request password reset',
                    },
                    {
                        type: 'Type on password reset code field',
                        code: VALID_PASSWORD_RESET_CODE_LIST[1],
                    },
                    {
                        type: 'Submit password reset token form',
                    },
                    {
                        type: 'Type on new password field',
                        newPassword: TEST_STRONG_PASSWORD[1],
                    },
                    {
                        type: 'Submit password reset final form',
                    },
                ],
            },
    },
);
