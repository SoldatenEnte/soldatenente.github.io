import './ProjectShowcase.css';

type ProjectShowcaseProps = {
    title: string;
    description: string;
    imageUrl: string;
    projectUrl: string;
    onReturn: () => void;
};

export function ProjectShowcase({
    title,
    description,
    imageUrl,
    projectUrl,
    onReturn
}: ProjectShowcaseProps) {
    return (
        <div className="project-showcase-container">
            <div className="project-image-container">
                <img src={imageUrl} alt={`${title} project screenshot`} />
            </div>
            <div className="project-details-container">
                <h1>{title}</h1>
                <p>{description}</p>
                <div className="project-actions">
                    <a
                        href={projectUrl}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="project-button primary"
                    >
                        Launch Project
                    </a>
                    <button onClick={onReturn} className="project-button secondary">
                        Return to Ocean
                    </button>
                </div>
            </div>
        </div>
    );
}