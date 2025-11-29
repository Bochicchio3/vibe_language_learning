import api from './client';

const POLL_INTERVAL = 1000; // 1 second
const MAX_RETRIES = 60; // 60 seconds timeout

const pollJob = async (jobId) => {
    for (let i = 0; i < MAX_RETRIES; i++) {
        const status = await api.get(`/grammar/status/${jobId}`);

        if (status.status === 'SUCCESS') {
            return status.result;
        } else if (status.status === 'FAILURE') {
            throw new Error(status.result?.error || 'Job failed');
        }

        // Wait before next poll
        await new Promise(resolve => setTimeout(resolve, POLL_INTERVAL));
    }
    throw new Error('Job timed out');
};

export const generateConceptCard = async (topic, level, model) => {
    const { job_id } = await api.post('/grammar/concept', {
        topic,
        level,
        model
    });
    return pollJob(job_id);
};

export const generateExercises = async (topic, level, model) => {
    const { job_id } = await api.post('/grammar/exercises', {
        topic,
        level,
        model
    });
    return pollJob(job_id);
};

export const generateContextCard = async (topic, level, model) => {
    const { job_id } = await api.post('/grammar/context', {
        topic,
        level,
        model
    });
    return pollJob(job_id);
};

