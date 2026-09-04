import { useNavigate } from "react-router-dom";

function BackButton() {
    const navigate = useNavigate();

    const handleBack = () => {
        if (window.history.length > 1) {
            navigate(-1);
        } else {
            navigate("/");
        }
    };

    return (
        <button className="back-button" onClick={handleBack}>
            ← Back
        </button>
    );
}

export default BackButton;
