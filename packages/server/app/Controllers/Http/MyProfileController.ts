import { HttpContextContract } from '@ioc:Adonis/Core/HttpContext';
import { GetMyProfileInformationResponseBody } from '@musicroom/types';
import invariant from 'tiny-invariant';

export default class MyProfileController {
    public async getMyProfileInformation({
        auth,
    }: HttpContextContract): Promise<GetMyProfileInformationResponseBody> {
        const user = auth.user;
        invariant(
            user !== undefined,
            'User must be authenticated to get her profile information',
        );

        const { nickname: userNickname } = user;

        //After this user model column are erased
        await user
            .loadCount('following')
            .loadCount('followers')
            .loadCount('mpeRooms')
            .loadCount('devices');

        const devicesCounter = Number(user.$extras.devices_count);
        invariant(devicesCounter > 0, 'user has no related devices');

        return {
            userID: user.uuid,
            userNickname,
            devicesCounter,
            followersCounter: Number(user.$extras.followers_count),
            followingCounter: Number(user.$extras.following_count),
            playlistsCounter: Number(user.$extras.mpeRooms_count),
        };
    }
}
