import XSvg from "../svgs/X";

import { MdHomeFilled } from "react-icons/md";
import { IoNotifications } from "react-icons/io5";
import { FaUser } from "react-icons/fa";
import { Link } from "react-router-dom";
import { BiLogOut } from "react-icons/bi";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import toast from "react-hot-toast";

const Sidebar = () => {
	const queryClient = useQueryClient();
	const { mutate: logout } = useMutation({
		mutationFn: async () => {
			try {
				const res = await fetch("/api/auth/logout", {
					method: "POST",
				});
				const data = await res.json();

				if (!res.ok) {
					throw new Error(data.error || "Something went wrong");
				}
			} catch (error) {
				throw new Error(error.message || "Failed to logout");
			}
		},
		onSuccess: () => {
			queryClient.invalidateQueries({ queryKey: ["authUser"] });
		},
		onError: () => {
			toast.error("Logout failed");
		},
	});

	const { data: authUser } = useQuery({
		queryKey: ["authUser"],
		queryFn: async () => {
			const res = await fetch("/api/auth/me");
			const data = await res.json();

			if (!res.ok || data.error) {
				throw new Error(data.error || "Failed to fetch authenticated user");
			}

			console.log("Auth User Response:", JSON.stringify(data, null, 2));

			// Return only the user object
			return data.user || {};
		},
		retry: false,
	});

	console.log("User ID:", authUser?._id || "No ID Found");
	console.log("Username:", authUser?.username || "No Username Found");

	return (
		<div className="md:flex-[2_2_0] w-18 max-w-52">
			<div className="sticky top-0 left-0 h-screen flex flex-col border-r border-gray-700 w-20 md:w-full">
				<Link to="/" className="flex justify-center md:justify-start">
					<XSvg className="px-2 w-12 h-12 rounded-full fill-white hover:bg-stone-900" />
				</Link>
				<ul className="flex flex-col gap-3 mt-4">
					<li className="flex justify-center md:justify-start">
						<Link
							to="/"
							className="flex gap-3 items-center hover:bg-stone-900 transition-all rounded-full duration-300 py-2 pl-2 pr-4 max-w-fit cursor-pointer">
							<MdHomeFilled className="w-8 h-8" />
							<span className="text-lg hidden md:block">Home</span>
						</Link>
					</li>
					<li className="flex justify-center md:justify-start">
						<Link
							to="/notifications"
							className="flex gap-3 items-center hover:bg-stone-900 transition-all rounded-full duration-300 py-2 pl-2 pr-4 max-w-fit cursor-pointer">
							<IoNotifications className="w-6 h-6" />
							<span className="text-lg hidden md:block">Notifications</span>
						</Link>
					</li>

					<li>
						{" "}
						<Link
							to={
								authUser?.user?.username
									? `/profile/${authUser.user.username}`
									: "#"
							}
							className="flex gap-3 items-center hover:bg-stone-900
							transition-all rounded-full duration-300 py-2 pl-2 pr-4 max-w-fit
							cursor-pointer">
							<FaUser className="w-6 h-6" />
							<span className="text-lg hidden md:block">Profile</span>
						</Link>
					</li>
				</ul>
				{authUser?.username || authUser?.user?.username ? (
					<Link
						to={`/profile/${authUser?.username || authUser?.user?.username}`}
						className="mt-auto mb-10 flex gap-2 items-start transition-all duration-300 hover:bg-[#181818] py-2 px-4 rounded-full">
						<div className="avatar hidden md:inline-flex">
							<div className="w-8 rounded-full">
								<img
									src={
										authUser?.profileImg ||
										authUser?.user?.profileImg ||
										"/avatar-placeholder.png"
									}
								/>
							</div>
						</div>
						<div className="flex justify-between flex-1">
							<div className="hidden md:block">
								<p className="text-white font-bold text-sm w-20 truncate">
									{authUser?.fullName || authUser?.user?.fullName}
								</p>
								<p className="text-slate-500 text-sm">
									@{authUser?.username || authUser?.user?.username}
								</p>
							</div>
							<BiLogOut
								className="w-5 h-5 cursor-pointer"
								onClick={(e) => {
									e.stopPropagation(); // Prevent parent event propagation
									e.preventDefault(); // Prevent default behavior

									logout(undefined, {
										onSuccess: () => {
											window.location.reload(); // Reload the page on successful logout
										},
									});
								}}
							/>
						</div>
					</Link>
				) : null}
			</div>
		</div>
	);
};
export default Sidebar;
