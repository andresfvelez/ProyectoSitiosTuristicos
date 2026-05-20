import {
    AIPayload,
    UserContext,
    WeightingCriteria,
    TouristPlace
} from '../../Components/models/IaPayload';

export function buildAIPayload(
    userContext: UserContext,
    availablePlaces: TouristPlace[],
    maxResults: number = 5
): AIPayload {

    const defaultWeighting: WeightingCriteria = {
        environmentMatch: 0.10,
        activityMatch: 0.10,
        distance: 0.20,
        popularity: 0.20,
        novelty: 0.40
    };

    return {
        userContext,
        weightingCriteria: defaultWeighting,
        availablePlaces,
        maxResults
    };
}