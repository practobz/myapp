import React, { createContext, useContext, useState } from 'react';
import { format } from 'date-fns';
import axios from 'axios';

const initialCustomers = [
	{
		id: '1',
		name: 'Shoppers Stop',
		nextDueDate: '2024-06-10',
		nextDueContent: 'New Collection Arrival',
		contentItems: [
			{ id: '101', date: '2024-06-10', description: 'New Collection Arrival' },
			{ id: '102', date: '2024-06-15', description: 'Weekend Sale Announcement' },
			{ id: '103', date: '2024-07-01', description: 'Buy One Get One offer' },
			{ id: '104', date: '2024-07-14', description: 'Happy Diwali wishes' },
		],
	},
	{
		id: '2',
		name: 'Pantaloons',
		nextDueDate: '2024-06-13',
		nextDueContent: 'Winter',
		contentItems: [
			{ id: '201', date: '2024-06-13', description: 'Winter' },
			{ id: '202', date: '2024-06-20', description: 'End of Season Sale' },
		],
	},
];

const CustomerContext = createContext();

export function useCustomers() {
	const context = useContext(CustomerContext);
	if (context === undefined) {
		throw new Error('useCustomers must be used within a CustomerProvider');
	}
	return context;
}

export function CustomerProvider({ children }) {
	const [customers, setCustomers] = useState(initialCustomers);

	const fetchUsers = async () => {
		const res = await axios.get(`${process.env.REACT_APP_API_URL}/users`);
		return res.data;
	};

	const addCustomer = (customer) => {
		const newCustomer = {
			...customer,
			id: Date.now().toString(),
		};
		setCustomers([...customers, newCustomer]);
	};

	const getCustomer = (id) => {
		return customers.find((customer) => customer.id === id);
	};

	const addContentItem = (customerId, contentItem) => {
		setCustomers((prevCustomers) => {
			return prevCustomers.map((customer) => {
				if (customer.id === customerId) {
					const newContentItem = {
						...contentItem,
						id: Date.now().toString(),
					};

					const updatedContentItems = [...customer.contentItems, newContentItem].sort(
						(a, b) => new Date(a.date).getTime() - new Date(b.date).getTime()
					);

					const now = new Date();
					const nextDueItem =
						updatedContentItems.find(
							(item) => new Date(item.date).getTime() >= now.getTime()
						) || updatedContentItems[0];

					return {
						...customer,
						contentItems: updatedContentItems,
						nextDueDate: nextDueItem ? nextDueItem.date : customer.nextDueDate,
						nextDueContent: nextDueItem ? nextDueItem.description : customer.nextDueContent,
					};
				}
				return customer;
			});
		});
	};

	const updateContentItem = (customerId, contentItem) => {
		setCustomers((prevCustomers) => {
			return prevCustomers.map((customer) => {
				if (customer.id === customerId) {
					const updatedContentItems = customer.contentItems
						.map((item) => (item.id === contentItem.id ? contentItem : item))
						.sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime());

					const now = new Date();
					const nextDueItem =
						updatedContentItems.find(
							(item) => new Date(item.date).getTime() >= now.getTime()
						) || updatedContentItems[0];

					return {
						...customer,
						contentItems: updatedContentItems,
						nextDueDate: nextDueItem ? nextDueItem.date : customer.nextDueDate,
						nextDueContent: nextDueItem ? nextDueItem.description : customer.nextDueContent,
					};
				}
				return customer;
			});
		});
	};

	const deleteContentItem = (customerId, contentItemId) => {
		setCustomers((prevCustomers) => {
			return prevCustomers.map((customer) => {
				if (customer.id === customerId) {
					const updatedContentItems = customer.contentItems
						.filter((item) => item.id !== contentItemId)
						.sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime());

					const now = new Date();
					const nextDueItem =
						updatedContentItems.find(
							(item) => new Date(item.date).getTime() >= now.getTime()
						) || updatedContentItems[0];

					return {
						...customer,
						contentItems: updatedContentItems,
						nextDueDate: nextDueItem ? nextDueItem.date : '',
						nextDueContent: nextDueItem ? nextDueItem.description : '',
					};
				}
				return customer;
			});
		});
	};

	return (
		<CustomerContext.Provider
			value={{
				customers,
				addCustomer,
				getCustomer,
				addContentItem,
				updateContentItem,
				deleteContentItem,
				fetchUsers,
			}}
		>
			{children}
		</CustomerContext.Provider>
	);
}