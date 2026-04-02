import React, { useState } from 'react';
import MainVideoFeedPanel from '../panels/MainVideoFeedPanel';
import MapViewPanel from '../panels/MapViewPanel';
import MissionListPanel from '../panels/MissionListPanel';
import DroneInfoPanel from '../panels/DroneInfoPanel';
import StreamButtonPanel from '../panels/StreamButtonPanel';
import QuickLaunchDialog from '../components/QuickLaunchDialog';
import QuickLaunchDialogForm from '../components/QuickLaunchDialogForm';

export default function DashboardPage() {
    const [isLaunchDialogOpen, setIsLaunchDialogOpen] = useState(false);
    const [isLaunchFormOpen, setIsLaunchFormOpen] = useState(false);
    const [selectedLaunchType, setSelectedLaunchType] = useState('ROI');

    return (
        <div
            className="p-[28px] flex flex-row gap-[28px] w-full h-[calc(100vh-104px)] overflow-hidden"
            style={{ backgroundImage: `url('/src/assets/img_background.png')`, backgroundSize: 'cover', backgroundPosition: 'center' }}
        >
            {/* Column 1 */}
            <div className="flex-1 flex flex-col gap-[28px] min-w-0">
                {/* Video Frame */}
                <div className="flex-1 rounded-[24px] border border-[#2a3240] overflow-hidden shadow-lg min-h-0">
                    <MainVideoFeedPanel />
                </div>
                {/* Bottom Container View */}
                <div className="h-[240px] flex flex-row p-[14px] gap-[16px] shrink-0 bg-[#27313D] border border-[#2a3240] rounded-[24px] shadow-lg overflow-hidden">
                    <div className={`w-[413px] h-full shrink-0 ${(isLaunchDialogOpen || isLaunchFormOpen) ? 'invisible' : ''}`}>
                        <MapViewPanel />
                    </div>
                    <div className="flex-1 h-full min-w-0">
                        <MissionListPanel />
                    </div>
                </div>
            </div>

            {/* Column 2 */}
            <div className="w-[440px] shrink-0 flex flex-col gap-[28px]">
                {/* Drone Info */}
                <div className="flex-1 min-h-0">
                    <DroneInfoPanel />
                </div>
                {/* Button Stream */}
                <div className="h-[360px] shrink-0">
                    <StreamButtonPanel onLaunchClick={() => setIsLaunchDialogOpen(true)} />
                </div>
            </div>

            {/* Dialogs */}
            <QuickLaunchDialog
                isOpen={isLaunchDialogOpen}
                onClose={() => setIsLaunchDialogOpen(false)}
                onConfirm={(selectedType) => {
                    setSelectedLaunchType(selectedType);
                    setIsLaunchDialogOpen(false);
                    setIsLaunchFormOpen(true);
                }}
            />

            <QuickLaunchDialogForm
                isOpen={isLaunchFormOpen}
                missionType={selectedLaunchType}
                onClose={() => setIsLaunchFormOpen(false)}
                onLaunch={(type) => {
                    console.log('Final Launch confirmed with type:', type);
                    setIsLaunchFormOpen(false);
                }}
            />
        </div>
    );
}
