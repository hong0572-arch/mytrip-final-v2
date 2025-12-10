export type TravelFormData = {
    // Step 1
    destination: string;
    startDate: string;
    endDate: string;
    travelers: number;
    budget: string; // e.g. "300~500만원"

    // Step 2
    accommodationType: string[]; // 5성급, 리조트, etc.
    airlineType: string; // 국적기, LCC, 상관없음

    // Step 3
    themes: string[]; // 쇼핑, 미식, etc.
    guide: boolean;

    // Step 4
    transport: string[];
    contact: string;
    additionalRequests: string;
};

export const INITIAL_DATA: TravelFormData = {
    destination: "",
    startDate: "",
    endDate: "",
    travelers: 2,
    budget: "",
    accommodationType: [],
    airlineType: "",
    themes: [],
    guide: false,
    transport: [],
    contact: "",
    additionalRequests: "",
};
