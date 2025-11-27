import { newsAPI } from './api';

export const getCategories = async () => {
    return await newsAPI.getNewsCategories();
};

export const fetchNewsByCategory = async (category) => {
    return await newsAPI.getNewsByCategory(category);
};
