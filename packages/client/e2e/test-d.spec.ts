import {
    test,
    expect,
    Browser,
    BrowserContext,
    Page,
    Locator,
} from '@playwright/test';
import { assertIsNotNull, assertIsNotUndefined } from './_utils/assert';
import { mockSearchRooms } from './_utils/mock-http';
import { waitForYouTubeVideoToLoad } from './_utils/wait-youtube';

const AVAILABLE_USERS_LIST = [
    {
        uuid: '8d71dcb3-9638-4b7a-89ad-838e2310686c',
        nickname: 'Francis',
    },
    {
        uuid: '71bc3025-b765-4f84-928d-b4dca8871370',
        nickname: 'Moris',
    },
    {
        uuid: 'd125ecde-b0ee-4ab8-a488-c0e7a8dac7c5',
        nickname: 'Leïla',
    },
    {
        uuid: '7f4bc598-c5be-4412-acc4-515a87b797e7',
        nickname: 'Manon',
    },
];

async function createContext({
    browser,
    index,
}: {
    browser: Browser;
    index: number;
}) {
    const user = AVAILABLE_USERS_LIST[index];
    const context = await browser.newContext({
        storageState: {
            cookies: [],
            origins: [
                {
                    origin: 'http://localhost:4000',
                    localStorage: [
                        {
                            name: 'USER_ID',
                            value: user.uuid,
                        },
                    ],
                },
            ],
        },
    });
    await mockSearchRooms({
        context,
        knownSearches: {
            'BB Brunes': [
                {
                    id: 'X3VNRVo7irM',
                    title: 'BB BRUNES - Dis-Moi [Clip Officiel]',
                    artistName: 'BBBrunesMusic',
                    duration: 0,
                },
                {
                    id: 'mF5etHMRMMM',
                    title: 'BB BRUNES - Coups et Blessures [Clip Officiel]',
                    artistName: 'BBBrunesMusic',
                    duration: 0,
                },
                {
                    id: '1d3etBBSSfw',
                    title: 'BB BRUNES - Lalalove You [Clip Officiel]',
                    artistName: 'BBBrunesMusic',
                    duration: 0,
                },
                {
                    id: 'DyRDeEWhW6M',
                    title: 'BB BRUNES - Aficionado [Clip Officiel]',
                    artistName: 'BBBrunesMusic',
                    duration: 0,
                },
                {
                    id: 'Qs-ucIS2B-0',
                    title: 'BB BRUNES - Stéréo [Clip Officiel]',
                    artistName: 'BBBrunesMusic',
                    duration: 0,
                },
            ],
        },
    });

    return {
        context,
        userName: user.nickname,
    };
}

async function setupPageFromContext(context: BrowserContext) {
    const page = await context.newPage();

    await page.goto('/');

    const focusTrap = page.locator('text="Click"').first();
    await focusTrap.click();

    return {
        page,
    };
}

async function createPublicRoomWithInvitation({
    page,
    roomName,
}: {
    page: Page;
    roomName: string;
}) {
    await expect(page.locator('text="Home"').first()).toBeVisible();

    const goToTracksSearch = page.locator('text="Search"');
    await goToTracksSearch.click();

    const trackQuery = 'BB Brunes';
    await page.fill(
        'css=[placeholder*="Search a track"] >> visible=true',
        trackQuery,
    );
    await page.keyboard.press('Enter');

    await expect(page.locator('text="Results"')).toBeVisible();

    const firstMatchingSong = page.locator('text=BB Brunes').first();
    await expect(firstMatchingSong).toBeVisible();

    const selectedSongTitle = await firstMatchingSong.textContent();
    assertIsNotNull(
        selectedSongTitle,
        'The selected song must exist and have a text content',
    );

    await firstMatchingSong.click();

    await expect(
        page.locator('text="What is the name of the room?"'),
    ).toBeVisible();

    await page.fill('css=[placeholder="Francis Cabrel OnlyFans"]', roomName);
    await page.click('text="Next" >> visible=true');

    await expect(
        page.locator('text="What is the opening status of the room?"'),
    ).toBeVisible();

    const publicMode = page.locator(
        'css=[aria-selected="true"] >> text="Public"',
    );
    await expect(publicMode).toBeVisible();
    const invitationModeSwitch = page.locator('css=[role="switch"]');
    await invitationModeSwitch.click();
    await page.click('text="Next" >> visible=true');

    const noVotingRestriction = page.locator(
        'css=[aria-selected="true"] >> text="No restriction"',
    );
    await expect(noVotingRestriction).toBeVisible();
    await page.click('text="Next" >> visible=true');

    const broadcastMode = page.locator(
        'css=[aria-selected="true"] >> text="Broadcast"',
    );
    await expect(broadcastMode).toBeVisible();
    await page.click('text="Next" >> visible=true');

    const oneVoteConstraintButton = page.locator(
        `css=[aria-selected="true"] >> text="Party at Kitty and Stud's"`,
    );
    await expect(oneVoteConstraintButton).toBeVisible();

    await page.click('text="Next" >> visible=true');

    await expect(page.locator('text="Confirm room creation"')).toBeVisible();
    const elementWithSelectedSongTitle = page.locator(
        `text=${selectedSongTitle}`,
    );
    await expect(elementWithSelectedSongTitle).toBeVisible();

    await page.click('text="Next" >> visible=true');

    // We expect creation form to have disappeared
    // and user to have not been redirected to another screen than
    // the one in which she opened the form.
    await expect(page.locator('text="Results"').first()).toBeVisible();

    const miniPlayerWithRoomName = page.locator(`text="${roomName}"`).first();
    await expect(miniPlayerWithRoomName).toBeVisible();
    const miniPlayerWithSelectedSong = page.locator(
        `text=${selectedSongTitle}`,
    );
    await expect(miniPlayerWithSelectedSong).toBeVisible();

    await miniPlayerWithRoomName.click();

    return {
        roomName,
        initialTrack: selectedSongTitle,
    };
}

async function waitForJoiningRoom({
    page,
    roomName,
}: {
    page: Page;
    roomName: string;
}) {
    const miniPlayerWithRoomName = page.locator(`text="${roomName}"`).first();
    await expect(miniPlayerWithRoomName).toBeVisible();

    await miniPlayerWithRoomName.click();
}

async function joinRoom({ page, roomName }: { page: Page; roomName: string }) {
    await page.click('text="Go to Music Track Vote"');

    // Code to use infinite scroll
    let matchingRoom: Locator | undefined;
    let hasFoundRoom = false;

    await page.mouse.move((page.viewportSize()?.width ?? 0) / 2, 150);
    while (hasFoundRoom === false) {
        await page.mouse.wheel(0, 999999);

        matchingRoom = page.locator(`text="${roomName}"`).first();
        const isMatchingRoomVisible = await matchingRoom.isVisible();
        if (isMatchingRoomVisible === false) {
            hasFoundRoom = false;

            continue;
        }

        hasFoundRoom = true;
    }
    assertIsNotUndefined(matchingRoom);

    await expect(matchingRoom).toBeVisible();

    await matchingRoom.click();

    // Close MTV Search
    await page.click('css=[aria-label="Go back"] >> visible=true');

    // Open player full screen
    const miniPlayerWithRoomName = page.locator(`text="${roomName}"`).first();
    await expect(miniPlayerWithRoomName).toBeVisible();

    await miniPlayerWithRoomName.click();
}

async function waitForPlayerState({
    page,
    testID,
}: {
    page: Page;
    testID: `music-player-${'playing' | 'not-playing'}-device-${
        | 'emitting'
        | 'muted'}`;
}) {
    const player = page.locator(
        `css=[data-testid="${testID}"] >> visible=true`,
    );
    await expect(player).toBeVisible();
}

async function playTrack(page: Page) {
    const fullScreenPlayerPlayButton = page.locator(
        'css=[aria-label="Play the video"] >> nth=1',
    );
    await expect(fullScreenPlayerPlayButton).toBeVisible();

    await fullScreenPlayerPlayButton.click();
}

async function changeEmittingDevice({
    page,
    emittingDeviceIndex,
}: {
    page: Page;
    emittingDeviceIndex: number;
}) {
    const settingsTab = page.locator('text="Settings" >> visible=true');
    await expect(settingsTab).toBeVisible();
    await settingsTab.click();

    const changeEmittingDeviceButton = page.locator(
        'text="Change emitting device" >> visible=true',
    );
    await expect(changeEmittingDeviceButton).toBeVisible();
    await changeEmittingDeviceButton.click();

    const deviceToMakeEmitter = page.locator(
        `text="Web Player (Firefox)" >> nth=${emittingDeviceIndex}`,
    );
    await expect(deviceToMakeEmitter).toBeVisible();
    await deviceToMakeEmitter.click();
}

test('Test C', async ({ browser }) => {
    const [
        { context: userAContext, userName: userAName },
        { context: userBContext, userName: userBName },
    ] = await Promise.all([
        createContext({ browser, index: 0 }),
        createContext({ browser, index: 1 }),
    ]);
    const [{ page: userADevice1Page }, { page: userBPage }] = await Promise.all(
        [
            setupPageFromContext(userAContext),

            setupPageFromContext(userBContext),
        ],
    );

    const roomName = 'MusicRoom is the best';

    await createPublicRoomWithInvitation({ page: userADevice1Page, roomName });

    const { page: userADevice2Page } = await setupPageFromContext(userAContext);
    await waitForJoiningRoom({ page: userADevice2Page, roomName });

    const { page: userADevice3Page } = await setupPageFromContext(userAContext);
    await waitForJoiningRoom({ page: userADevice3Page, roomName });

    await joinRoom({ page: userBPage, roomName });

    await Promise.all([
        waitForYouTubeVideoToLoad(userADevice1Page),
        waitForYouTubeVideoToLoad(userADevice2Page),
        waitForYouTubeVideoToLoad(userADevice3Page),
        waitForYouTubeVideoToLoad(userBPage),
    ]);

    await Promise.all([
        playTrack(userADevice2Page),

        waitForPlayerState({
            page: userADevice1Page,
            testID: 'music-player-playing-device-emitting',
        }),
        waitForPlayerState({
            page: userADevice2Page,
            testID: 'music-player-playing-device-muted',
        }),
        waitForPlayerState({
            page: userADevice3Page,
            testID: 'music-player-playing-device-muted',
        }),
        waitForPlayerState({
            page: userBPage,
            testID: 'music-player-playing-device-emitting',
        }),
    ]);

    await Promise.all([
        changeEmittingDevice({
            page: userADevice1Page,
            emittingDeviceIndex: 1,
        }),

        waitForPlayerState({
            page: userADevice1Page,
            testID: 'music-player-playing-device-muted',
        }),
        waitForPlayerState({
            page: userADevice2Page,
            testID: 'music-player-playing-device-emitting',
        }),
        waitForPlayerState({
            page: userADevice3Page,
            testID: 'music-player-playing-device-muted',
        }),
        waitForPlayerState({
            page: userBPage,
            testID: 'music-player-playing-device-emitting',
        }),
    ]);

    await Promise.all([
        userADevice2Page.close(),

        waitForPlayerState({
            page: userADevice1Page,
            testID: 'music-player-playing-device-emitting',
        }),
        waitForPlayerState({
            page: userADevice3Page,
            testID: 'music-player-playing-device-muted',
        }),
        waitForPlayerState({
            page: userBPage,
            testID: 'music-player-playing-device-emitting',
        }),
    ]);

    await userBPage.waitForTimeout(100_000);
});
