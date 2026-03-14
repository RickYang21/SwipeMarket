"use client";

import React, { createContext, useContext, useReducer, ReactNode } from "react";
import { SwipeRecord, Transaction, Screen } from "@/types/types";

interface AppState {
    balance: number;
    swipeHistory: SwipeRecord[];
    transactions: Transaction[];
    selectedCategories: string[];
    currentScreen: Screen;
    betAmount: number;
}

type AppAction =
    | { type: "SET_SCREEN"; screen: Screen }
    | { type: "SET_CATEGORIES"; categories: string[] }
    | { type: "ADD_SWIPE"; record: SwipeRecord }
    | { type: "DEDUCT_BALANCE"; amount: number }
    | { type: "ADD_FUNDS"; amount: number }
    | { type: "ADD_TRANSACTION"; transaction: Transaction }
    | { type: "SET_BET_AMOUNT"; amount: number }
    | { type: "WITHDRAW_FUNDS"; amount: number };

const initialState: AppState = {
    balance: 100.0,
    swipeHistory: [],
    transactions: [
        {
            id: "t0",
            type: "deposit",
            amount: 100.0,
            description: "Initial deposit",
            timestamp: Date.now() - 86400000,
        },
    ],
    selectedCategories: [],
    currentScreen: "filter",
    betAmount: 10,
};

function appReducer(state: AppState, action: AppAction): AppState {
    switch (action.type) {
        case "SET_SCREEN":
            return { ...state, currentScreen: action.screen };
        case "SET_CATEGORIES":
            return { ...state, selectedCategories: action.categories };
        case "ADD_SWIPE":
            return {
                ...state,
                swipeHistory: [action.record, ...state.swipeHistory],
            };
        case "DEDUCT_BALANCE":
            return {
                ...state,
                balance: Math.max(0, state.balance - action.amount),
            };
        case "ADD_FUNDS":
            return { ...state, balance: state.balance + action.amount };
        case "WITHDRAW_FUNDS":
            return {
                ...state,
                balance: Math.max(0, state.balance - action.amount),
            };
        case "ADD_TRANSACTION":
            return {
                ...state,
                transactions: [action.transaction, ...state.transactions],
            };
        case "SET_BET_AMOUNT":
            return { ...state, betAmount: action.amount };
        default:
            return state;
    }
}

interface AppContextType {
    state: AppState;
    dispatch: React.Dispatch<AppAction>;
}

const AppContext = createContext<AppContextType | undefined>(undefined);

export function AppProvider({ children }: { children: ReactNode }) {
    const [state, dispatch] = useReducer(appReducer, initialState);

    return (
        <AppContext.Provider value={{ state, dispatch }}>
            {children}
        </AppContext.Provider>
    );
}

export function useApp() {
    const context = useContext(AppContext);
    if (!context) {
        throw new Error("useApp must be used within an AppProvider");
    }
    return context;
}
