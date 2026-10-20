import {
    AIPayload,
    UserContext,
    WeightingCriteria,
    TouristPlace
} from '../../Components/models/IaPayload';

export function buildAIPayload(
    userContext: UserContext,
    availablePlaces: TouristPlace[],
    maxResults: number = 10
): AIPayload {

    // Ponderación optimizada para priorizar el gusto real del usuario
    const defaultWeighting: WeightingCriteria = {
        environmentMatch: 0.30,
        distance: 0.25,
        accessMatch: 0.15,
        budgetMatch: 0.15,
        popularity: 0.15
    };

    return {
        userContext,
        weightingCriteria: defaultWeighting,
        availablePlaces,
        maxResults
    };
}