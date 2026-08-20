import React, { useState, useEffect } from 'react';
import axios from 'axios';
import { FaBookOpen, FaTasks, FaCommentDots, FaMagic, FaFileAlt } from 'react-icons/fa';
import './TodaysSchedule.css'; // We will create this CSS file next

const TodaysSchedule = () => {
    const [schedule, setSchedule] = useState([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(null);
    const [currentTime, setCurrentTime] = useState(new Date());

    useEffect(() => {
        const fetchSchedule = async () => {
            try {
                // This assumes your auth token is handled by an Axios interceptor
                const res = await axios.get('/api/schedule/today');
                setSchedule(res.data);
            } catch (err) {
                setError('Failed to load schedule. Please try again later.');
                console.error(err);
            } finally {
                setLoading(false);
            }
        };
        fetchSchedule();

        // Update current time every minute to keep status and countdowns fresh
        const timer = setInterval(() => setCurrentTime(new Date()), 60000);
        return () => clearInterval(timer);
    }, []);

    const getStatusInfo = (item) => {
        const now = currentTime;
        const [startH, startM] = item.start_time.split(':');
        const [endH, endM] = item.end_time.split(':');
        const startTime = new Date(now.getFullYear(), now.getMonth(), now.getDate(), startH, startM);
        const endTime = new Date(now.getFullYear(), now.getMonth(), now.getDate(), endH, endM);

        if (now > endTime) return { status: 'Finished', icon: '', color: 'text-gray-500' };
        if (now >= startTime && now <= endTime) return { status: 'Active', icon: '', color: 'text-green-500' };
        return { status: 'Upcoming', icon: '', color: 'text-blue-500' };
    };

    const upcomingClasses = schedule.filter(item => getStatusInfo(item).status === 'Upcoming');
    const nextClass = upcomingClasses[0];

    if (loading) return <div className="schedule-card">Loading schedule...</div>;
    if (error) return <div className="schedule-card text-red-500">{error}</div>;

    return (
        <div className="flex flex-col lg:flex-row gap-6">
            {/* Today's Schedule Timeline */}
            <div className="schedule-card flex-grow">
                <h3 className="font-bold text-xl mb-4">Today's Schedule</h3>
                {schedule.length > 0 ? (
                    <div className="timeline">
                        {schedule.map((item, index) => {
                            const { status, icon, color } = getStatusInfo(item);
                            const isNext = nextClass && item.id === nextClass.id;
                            
                            return (
                                <div key={item.id} className="timeline-item">
                                    <div className="timeline-marker">
                                        <span className={isNext ? 'text-yellow-400' : color}>
                                            {isNext ? '' : icon}
                                        </span>
                                    </div>
                                    <div className={`timeline-content ${status === 'Finished' ? 'opacity-60' : ''}`}>
                                        <p className="text-sm text-gray-500">
                                            {item.start_time.slice(0, 5)} - {item.end_time.slice(0, 5)}
                                        </p>
                                        <h4 className="font-semibold">{item.subject_name}</h4>
                                        <p className="text-sm">{item.grade_name} - {item.class_name} ({item.room})</p>
                                        <div className="action-buttons">
                                            <button><FaBookOpen /> Gradebook</button>
                                            <button><FaTasks /> Assignments</button>
                                            <button><FaCommentDots /> Message</button>
                                            {status === 'Active' && (
                                                <>
                                                    <button className="ai-button"><FaMagic /> Gen Lesson</button>
                                                    <button className="ai-button"><FaFileAlt /> Gen Quiz</button>
                                                </>
                                            )}
                                        </div>
                                    </div>
                                </div>
                            );
                        })}
                    </div>
                ) : (
                    <p>No classes scheduled for today.</p>
                )}
            </div>
            {/* Remainder of the Day Widget */}
            <RemainderWidget upcomingClasses={upcomingClasses} nextClass={nextClass} currentTime={currentTime} />
        </div>
    );
};

const RemainderWidget = ({ upcomingClasses, nextClass, currentTime }) => {
    const calculateCountdown = (startTimeStr) => {
        if (!startTimeStr) return '';
        const [startH, startM] = startTimeStr.split(':');
        const startTime = new Date(currentTime.getFullYear(), currentTime.getMonth(), currentTime.getDate(), startH, startM);
        const diff = startTime - currentTime;
        if (diff <= 0) return 'Starting now';
        
        const hours = Math.floor(diff / (1000 * 60 * 60));
        const minutes = Math.floor((diff % (1000 * 60 * 60)) / (1000 * 60));
        return `${hours > 0 ? `${hours}h ` : ''}${minutes}m until start`;
    };

    return (
        <div className="schedule-card lg:w-1/3">
            <h3 className="font-bold text-xl mb-4">Up Next & Remainder</h3>
            {nextClass ? (
                <div>
                    <div className="bg-blue-50 border border-blue-200 rounded-lg p-4 mb-4">
                        <p className="text-sm font-semibold text-blue-800">UP NEXT</p>
                        <h4 className="text-lg font-bold">{nextClass.subject_name}</h4>
                        <p>{nextClass.grade_name} - {nextClass.class_name}</p>
                        <p className="font-mono text-lg text-blue-600 mt-2">{calculateCountdown(nextClass.start_time)}</p>
                    </div>
                    <h5 className="font-semibold mb-2">Later Today</h5>
                    <ul className="space-y-2">
                        {upcomingClasses.slice(1).map(item => (
                            <li key={item.id} className="text-sm flex justify-between">
                                <span>{item.start_time.slice(0,5)} - {item.subject_name}</span>
                                <span className="text-gray-500">{item.room}</span>
                            </li>
                        ))}
                    </ul>
                </div>
            ) : (
                <div className="text-center p-6 bg-green-50 rounded-lg">
                    <span className="text-4xl"></span>
                    <p className="mt-2 font-semibold">No more classes today.</p>
                    <p className="text-sm text-gray-600">Enjoy the rest of your day!</p>
                </div>
            )}
        </div>
    );
};

export default TodaysSchedule;
