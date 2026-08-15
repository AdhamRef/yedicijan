"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.createBlogAdminEditorDataLoaders = createBlogAdminEditorDataLoaders;
function createBlogAdminEditorDataLoaders(dependencies) {
    async function loadBlogCreateEditorData() {
        return dependencies.loadDashboardPageData("blog", async () => {
            const [categories, campaigns] = await Promise.all([
                dependencies.loadCategories(),
                dependencies.loadCampaigns(),
            ]);
            return { categories, campaigns };
        });
    }
    async function loadBlogEditEditorData(postId) {
        return dependencies.loadDashboardPageData("blog", async () => {
            const post = await dependencies.getPost(postId);
            if (!post) {
                return {
                    post: null,
                    categories: [],
                    campaigns: [],
                };
            }
            const [categories, campaigns] = await Promise.all([
                dependencies.loadCategories(),
                dependencies.loadCampaigns(),
            ]);
            return { post, categories, campaigns };
        });
    }
    return {
        loadBlogCreateEditorData,
        loadBlogEditEditorData,
    };
}
